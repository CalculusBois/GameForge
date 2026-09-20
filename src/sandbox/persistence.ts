import { MODULAR_WARDROBE, WEAPON_SKINS } from './registry/cosmetics';
import { initialBundle, SAVE_VERSION, GENERATOR_VERSION, ITEMS, SKINS, OBJECTIVES, validateSettings, WORLD_LIMIT, TILE, DEPTH, type Bundle, type WorldSave, type ItemId } from './model';
import { validateSpec } from '../creator/spec';
export function validateBundle(value: unknown): asserts value is Bundle {
    const b = value as Bundle;
    if (!b || ![1, SAVE_VERSION].includes(b.version) || !b.worlds || !b.profile || (Object.keys(b.worlds).length ? !b.worlds[b.active] : b.active !== ''))
        throw new Error('This save version is unsupported. Your existing data has not been changed.');
    if (!Array.isArray(b.profile.owned) || !b.profile.owned.every(id => SKINS.some(s => s.id === id)) || !b.profile.owned.includes(b.profile.equipped))
        throw new Error('Invalid player profile.');
    if (b.profile.parts && (!Array.isArray(b.profile.parts) || !b.profile.parts.every(id=>typeof id==='string' && !!MODULAR_WARDROBE[id]))) throw new Error('Invalid wardrobe ownership.');
    for (const [slot,id] of Object.entries(b.profile.outfit ?? {})) if (!id || !MODULAR_WARDROBE[id] || MODULAR_WARDROBE[id].slot!==slot || !b.profile.parts?.includes(id)) throw new Error('Invalid equipped cosmetic.');
    if (b.profile.gunSkins && (!Array.isArray(b.profile.gunSkins) || !b.profile.gunSkins.every(id=>!!WEAPON_SKINS[id]))) throw new Error('Invalid weapon skins.');
    for (const id of Object.values(b.profile.guns ?? {})) if (!WEAPON_SKINS[id] || !b.profile.gunSkins?.includes(id)) throw new Error('Invalid weapon appearance.');
    for (const w of Object.values(b.worlds)) {
        if (![1, GENERATOR_VERSION].includes(w.generator))
            throw new Error('This world needs a generator migration. It has not been reset.');
        validateSettings(w.settings);
        if (w.inventory?.length !== 32 || !w.inventory.every(s => s === null || ITEMS[s.id] && Number.isInteger(s.count) && s.count > 0 && s.count <= ITEMS[s.id].stack) || !Number.isSafeInteger(w.coins) || w.coins < 0 || !w.player || !w.checkpoint || ![w.player.x, w.player.y, w.checkpoint.x, w.checkpoint.y].every(Number.isFinite) || Math.abs(w.player.x) > WORLD_LIMIT * TILE || w.player.y < 0 || w.player.y > DEPTH * TILE || !w.edits || !w.explored || !w.progress || !Number.isInteger(w.selected) || w.selected < 0 || w.selected > 7 || !Array.isArray(w.claimed) || !Array.isArray(w.opened) || !Array.isArray(w.defeated) || !Array.isArray(w.harvested))
            throw new Error('The save contains invalid world data.');
        if (w.upgrades && ![w.upgrades.vitalityCores, w.upgrades.manaCores].every(n => Number.isInteger(n) && n >= 0 && n <= 10)) throw new Error('Invalid permanent upgrades.');
        if (w.hunger !== undefined && (!Number.isFinite(w.hunger) || w.hunger < 0 || w.hunger > 100)) throw new Error('Invalid hunger.');
        if (w.elapsedMs !== undefined && (!Number.isFinite(w.elapsedMs) || w.elapsedMs < 0)) throw new Error('Invalid simulation clock.');
        if (w.equipment) for (const [slot,id] of Object.entries(w.equipment)) {
            if (!['head','chest','legs','accessory1','accessory2'].includes(slot) || (id !== null && (!ITEMS[id as ItemId] || ITEMS[id as ItemId].category !== 'equipment'))) throw new Error('Invalid equipment.');
        }
        if (w.furnace) {
            const f = w.furnace;
            if (!['copper_ore','iron','silver_ore','gold_ore','cobalt_ore'].includes(f.ore) || !['coal','wood'].includes(f.fuel) || !['copper_bar','bar','silver_bar','gold_bar','cobalt_bar'].includes(f.output) || ![f.remaining,f.stored].every(n=>Number.isInteger(n)&&n>=0&&n<=99) || !Number.isFinite(f.progressMs) || f.progressMs<0 || f.progressMs>=10000 || !Number.isFinite(f.fuelMs) || f.fuelMs<0 || f.fuelMs>1040000) throw new Error('Invalid furnace state.');
        }
        if (w.meal && (!['damage','defense','speed','regen','vitality'].includes(w.meal.type) || !Number.isFinite(w.meal.magnitude) || w.meal.magnitude<0 || w.meal.magnitude>25 || !Number.isFinite(w.meal.remainingMs) || w.meal.remainingMs<0 || w.meal.remainingMs>480000)) throw new Error('Invalid meal effect.');
        if (w.creations) {
            if (!Array.isArray(w.creations) || w.creations.length > 8) throw new Error('Invalid forged creations.');
            w.creations = w.creations.filter(c => {
                try { validateSpec(c.spec); } catch { return false; }
                return Number.isFinite(c.x) && Number.isFinite(c.y) && typeof c.defeated === 'boolean';
            });
        }
        if (w.discoveredItems && (!Array.isArray(w.discoveredItems) || !w.discoveredItems.every(id => typeof id === 'string'))) throw new Error('Invalid field journal.');
        if (w.discoveredEnemies && (!Array.isArray(w.discoveredEnemies) || !w.discoveredEnemies.every(id => typeof id === 'string'))) throw new Error('Invalid field journal.');
        if (w.onboarding && ![w.onboarding.mined, w.onboarding.smelted, w.onboarding.cooked, w.onboarding.equipped].every(v => typeof v === 'boolean')) throw new Error('Invalid onboarding checklist.');
        for (const [key, inv] of Object.entries(w.containers ?? {})) {
            if (!/^-?\d+,-?\d+$/.test(key) || inv.length !== 16 || !inv.every(s=>s===null || ITEMS[s.id] && Number.isInteger(s.count) && s.count>0 && s.count<=ITEMS[s.id].stack)) throw new Error('Invalid storage contents.');
        }
        for (const [key,wall] of Object.entries(w.backgroundWalls ?? {})) if (!/^-?\d+,-?\d+$/.test(key) || ![18,19].includes(wall)) throw new Error('Invalid background wall.');
        if (Object.keys(w.crops ?? {}).length > 128) throw new Error('Too many growing crops.');
        for (const [key,crop] of Object.entries(w.crops ?? {})) if (!/^-?\d+,-?\d+$/.test(key) || !Number.isFinite(crop.plantedAt) || crop.plantedAt<0) throw new Error('Invalid crop state.');
        for (const o of OBJECTIVES)
            if (!Number.isSafeInteger(w.progress[o.id]) || w.progress[o.id] < 0)
                throw new Error('Invalid objective progress.');
        for (const [key, chunk] of Object.entries(w.edits)) {
            if (!/^-?\d+,-?\d+$/.test(key))
                throw new Error('Invalid edited chunk.');
            for (const [position, m] of Object.entries(chunk)) {
                const [x, y] = position.split(',').map(Number);
                if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x > 31 || y < 0 || y > 31 || !Number.isInteger(m) || m < 0 || m > 42)
                    throw new Error('Invalid terrain edit.');
            }
        }
    }
}
function openDatabase(name='gameforge-frontier'): Promise<IDBDatabase> { return new Promise((resolve, reject) => { const r = indexedDB.open(name, 1); r.onupgradeneeded = () => r.result.createObjectStore('saves'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); r.onblocked = () => reject(new Error('Close another GameForge tab to update local storage.')); }); }
export class SaveStore {
    data: Bundle;
    private generation = 0;
    private db: IDBDatabase;
    private queue: Promise<unknown> = Promise.resolve();
    private timer: ReturnType<typeof setTimeout> | undefined;
    private position: {
        x: number;
        y: number;
        selected: number;
        world: string;
    } | undefined;
    onChange?: () => void;
    onError?: (message: string) => void;
    private constructor(db: IDBDatabase, data: Bundle) { this.db = db; this.data = data; }
    static async open(name='gameforge-frontier') { const db = await openDatabase(name); const stored = await new Promise<unknown>((resolve, reject) => { const r = db.transaction('saves').objectStore('saves').get('bundle'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); }); const data = stored ?? initialBundle(); validateBundle(data); const store = new SaveStore(db, data); if (!stored || data.version === 1)
        await store.transact(() => { }); return store; }
    get world(): WorldSave { return this.data.worlds[this.data.active]; }
    // Read/modify/write the whole world+profile bundle in one IndexedDB transaction.
    // The queued transaction reads the latest durable record, so purchases cannot race.
    transact<T>(change: (b: Bundle, w: WorldSave) => T): Promise<T> {
        const expectedWorld = this.data.active;
        const generation = this.generation;
        const run = this.queue.then(() => new Promise<T>((resolve, reject) => {
            if(generation !== this.generation) { reject(new Error('Session changed; stale transaction discarded.')); return; }
            const tx = this.db.transaction('saves', 'readwrite'), table = tx.objectStore('saves'), read = table.get('bundle');
            let next: Bundle, result: T, failure: unknown;
            read.onsuccess = () => { try {
                next = structuredClone(read.result ?? this.data);
                if (next.active !== expectedWorld)
                    throw new Error('The active world changed. Reopen this menu before trying again.');
                if (next.version === 1) { table.put(structuredClone(next), 'backup-v1'); next.version = SAVE_VERSION; }
                result = change(next, next.worlds[next.active]);
                validateBundle(next);
                table.put(next, 'bundle');
            }
            catch (e) {
                failure = e;
                tx.abort();
            } };
            tx.oncomplete = () => { this.data = next; this.onChange?.(); resolve(result); };
            tx.onerror = () => reject(failure ?? tx.error ?? new Error('Could not save. Changes were not applied.'));
            tx.onabort = () => reject(failure ?? tx.error ?? new Error('Could not save. Changes were not applied.'));
        }));
        this.queue = run.catch(() => { });
        return run.catch(error => { this.onError?.(error instanceof Error ? error.message : String(error)); throw error; });
    }
    schedulePosition(x: number, y: number, selected: number) { this.position = { x, y, selected, world: this.data.active }; if (this.timer)
        return; this.timer = setTimeout(() => { this.timer = undefined; const p = this.position; if (p)
        void this.transact((_b, w) => { if (w.id === p.world) {
            w.player = { x: p.x, y: p.y };
            w.selected = p.selected;
        } }).catch(() => { }); }, 1200); }
    async savePosition(x: number, y: number, selected: number) { if (this.timer) {
        clearTimeout(this.timer);
        this.timer = undefined;
    } this.position = undefined; await this.transact((_b, w) => { w.player = { x, y }; w.selected = selected; }); }
    async import(value: unknown) { validateBundle(value); await this.transact(b => { let active = b.active; for (const source of Object.values(value.worlds)) {
        const world = structuredClone(source);
        if (b.worlds[world.id]) {
            world.id = crypto.randomUUID();
            world.name += ' (imported)';
        }
        b.worlds[world.id] = world;
        if (source.id === value.active)
            active = world.id;
    } b.profile.owned = [...new Set([...b.profile.owned, ...value.profile.owned])]; b.profile.equipped = value.profile.equipped;
    b.profile.parts = [...new Set([...(b.profile.parts ?? []), ...(value.profile.parts ?? [])])];
    b.profile.gunSkins = [...new Set([...(b.profile.gunSkins ?? []), ...(value.profile.gunSkins ?? [])])];
    b.profile.outfit = { ...b.profile.outfit, ...value.profile.outfit };
    b.profile.guns = { ...b.profile.guns, ...value.profile.guns }; b.active = active; }); }
    export() { return JSON.stringify(this.data, null, 2); }
}
