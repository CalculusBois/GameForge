import {
    initialBundle,
    SAVE_VERSION,
    GENERATOR_VERSION,
    ITEMS,
    SKINS,
    OBJECTIVES,
    validateSettings,
    WORLD_LIMIT,
    TILE,
    DEPTH,
    ensureAnalytics,
    type Bundle,
    type WorldSave,
} from "./model";
export function validateBundle(value: unknown): asserts value is Bundle {
    const b = value as Bundle;
    if (
        !b ||
        b.version !== SAVE_VERSION ||
        !b.worlds ||
        !b.profile ||
        !b.worlds[b.active]
    )
        throw new Error(
            "This save version is unsupported. Your existing data has not been changed.",
        );
    if (
        !Array.isArray(b.profile.owned) ||
        !b.profile.owned.every((id) => SKINS.some((s) => s.id === id)) ||
        !b.profile.owned.includes(b.profile.equipped)
    )
        throw new Error("Invalid player profile.");
    for (const w of Object.values(b.worlds)) {
        ensureAnalytics(w);
        if (w.generator !== GENERATOR_VERSION)
            throw new Error(
                "This world needs a generator migration. It has not been reset.",
            );
        validateSettings(w.settings);
        if (
            w.inventory?.length !== 32 ||
            !w.inventory.every(
                (s) =>
                    s === null ||
                    (ITEMS[s.id] &&
                        Number.isInteger(s.count) &&
                        s.count > 0 &&
                        s.count <= ITEMS[s.id].stack),
            ) ||
            !Number.isSafeInteger(w.coins) ||
            w.coins < 0 ||
            !w.player ||
            !w.checkpoint ||
            ![w.player.x, w.player.y, w.checkpoint.x, w.checkpoint.y].every(
                Number.isFinite,
            ) ||
            Math.abs(w.player.x) > WORLD_LIMIT * TILE ||
            w.player.y < 0 ||
            w.player.y > DEPTH * TILE ||
            !w.edits ||
            !w.explored ||
            !w.progress ||
            !Number.isInteger(w.selected) ||
            w.selected < 0 ||
            w.selected > 7 ||
            !Array.isArray(w.claimed) ||
            !Array.isArray(w.opened) ||
            !Array.isArray(w.defeated) ||
            !Array.isArray(w.harvested)
        )
            throw new Error("The save contains invalid world data.");
        for (const o of OBJECTIVES)
            if (!Number.isSafeInteger(w.progress[o.id]) || w.progress[o.id] < 0)
                throw new Error("Invalid objective progress.");
        for (const [key, chunk] of Object.entries(w.edits)) {
            if (!/^-?\d+,-?\d+$/.test(key))
                throw new Error("Invalid edited chunk.");
            for (const [position, m] of Object.entries(chunk)) {
                const [x, y] = position.split(",").map(Number);
                if (
                    !Number.isInteger(x) ||
                    !Number.isInteger(y) ||
                    x < 0 ||
                    x > 31 ||
                    y < 0 ||
                    y > 31 ||
                    !Number.isInteger(m) ||
                    m < 0 ||
                    m > 9
                )
                    throw new Error("Invalid terrain edit.");
            }
        }
    }
}
function openDatabase(name = "gameforge-frontier"): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const r = indexedDB.open(name, 1);
        r.onupgradeneeded = () => r.result.createObjectStore("saves");
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
        r.onblocked = () =>
            reject(
                new Error(
                    "Close another GameForge tab to update local storage.",
                ),
            );
    });
}
export class SaveStore {
    data: Bundle;
    private db: IDBDatabase;
    private queue: Promise<unknown> = Promise.resolve();
    private timer: ReturnType<typeof setTimeout> | undefined;
    private position:
        | {
              x: number;
              y: number;
              selected: number;
              world: string;
          }
        | undefined;
    onChange?: () => void;
    onError?: (message: string) => void;
    private constructor(db: IDBDatabase, data: Bundle) {
        this.db = db;
        this.data = data;
    }
    static async open(name = "gameforge-frontier") {
        const db = await openDatabase(name);
        const stored = await new Promise<unknown>((resolve, reject) => {
            const r = db
                .transaction("saves")
                .objectStore("saves")
                .get("bundle");
            r.onsuccess = () => resolve(r.result);
            r.onerror = () => reject(r.error);
        });
        const data = stored ?? initialBundle();
        validateBundle(data);
        const store = new SaveStore(db, data);
        if (!stored) await store.transact(() => {});
        return store;
    }
    get world(): WorldSave {
        return this.data.worlds[this.data.active];
    }
    // Read/modify/write the whole world+profile bundle in one IndexedDB transaction.
    // The queued transaction reads the latest durable record, so purchases cannot race.
    transact<T>(change: (b: Bundle, w: WorldSave) => T): Promise<T> {
        const expectedWorld = this.data.active;
        const run = this.queue.then(
            () =>
                new Promise<T>((resolve, reject) => {
                    const tx = this.db.transaction("saves", "readwrite"),
                        table = tx.objectStore("saves"),
                        read = table.get("bundle");
                    let next: Bundle, result: T, failure: unknown;
                    read.onsuccess = () => {
                        try {
                            next = structuredClone(read.result ?? this.data);
                            if (next.active !== expectedWorld)
                                throw new Error(
                                    "The active world changed. Reopen this menu before trying again.",
                                );
                            result = change(next, next.worlds[next.active]);
                            table.put(next, "bundle");
                        } catch (e) {
                            failure = e;
                            tx.abort();
                        }
                    };
                    tx.oncomplete = () => {
                        this.data = next;
                        this.onChange?.();
                        resolve(result);
                    };
                    tx.onerror = () =>
                        reject(
                            failure ??
                                tx.error ??
                                new Error(
                                    "Could not save. Changes were not applied.",
                                ),
                        );
                    tx.onabort = () =>
                        reject(
                            failure ??
                                tx.error ??
                                new Error(
                                    "Could not save. Changes were not applied.",
                                ),
                        );
                }),
        );
        this.queue = run.catch(() => {});
        return run.catch((error) => {
            this.onError?.(
                error instanceof Error ? error.message : String(error),
            );
            throw error;
        });
    }
    schedulePosition(x: number, y: number, selected: number) {
        this.position = { x, y, selected, world: this.data.active };
        if (this.timer) return;
        this.timer = setTimeout(() => {
            this.timer = undefined;
            const p = this.position;
            if (p)
                void this.transact((_b, w) => {
                    if (w.id === p.world) {
                        w.player = { x: p.x, y: p.y };
                        w.selected = p.selected;
                    }
                }).catch(() => {});
        }, 1200);
    }
    async savePosition(x: number, y: number, selected: number) {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = undefined;
        }
        this.position = undefined;
        await this.transact((_b, w) => {
            w.player = { x, y };
            w.selected = selected;
        });
    }
    async import(value: unknown) {
        validateBundle(value);
        await this.transact((b) => {
            let active = b.active;
            for (const source of Object.values(value.worlds)) {
                const world = structuredClone(source);
                if (b.worlds[world.id]) {
                    world.id = crypto.randomUUID();
                    world.name += " (imported)";
                }
                b.worlds[world.id] = world;
                if (source.id === value.active) active = world.id;
            }
            b.profile.owned = [
                ...new Set([...b.profile.owned, ...value.profile.owned]),
            ];
            b.profile.equipped = value.profile.equipped;
            b.active = active;
        });
    }
    export() {
        return JSON.stringify(this.data, null, 2);
    }
    exportAnalytics() {
        return JSON.stringify(
            {
                schema: "gameforge.analytics",
                version: 1,
                exportedAt: new Date().toISOString(),
                activeWorld: this.data.active,
                worlds: Object.values(this.data.worlds).map((w) => ({
                    id: w.id,
                    name: w.name,
                    settings: w.settings,
                    created: w.created,
                    analytics: ensureAnalytics(w),
                })),
            },
            null,
            2,
        );
    }
}
