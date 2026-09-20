import { describe, it, expect } from "vitest";
import {
    DEFAULT_WORLD,
    CHUNK,
    DEPTH,
    ITEMS,
    newWorld,
    initialBundle,
    add,
    count,
    craft,
    unlock,
    claim,
    chest,
    ensureAnalytics,
    recordAnalytics,
    type ItemId,
} from "./model";
import {
    generateChunk,
    baseTile,
    readTile,
    editTile,
    chunkOf,
    localOf,
    surface,
    landmarks,
    harvestables,
} from "./terrain";
import { validateBundle } from "./persistence";
describe("seeded continuous terrain", () => {
    it("is deterministic and independent of load order", () => {
        const a = newWorld("a", DEFAULT_WORLD),
            b = newWorld("b", DEFAULT_WORLD);
        const keys = [
            [-2, 0],
            [0, 0],
            [1, 1],
            [4, 2],
            [-1, 3],
        ];
        const reference = keys.map(([x, y]) => generateChunk(a, x, y));
        for (const [x, y] of [...keys].reverse()) generateChunk(b, x, y);
        keys.forEach(([x, y], i) =>
            expect(generateChunk(b, x, y)).toEqual(reference[i]),
        );
    });
    it("uses global tile coordinates at both sides of boundaries", () => {
        const w = newWorld("a", DEFAULT_WORLD);
        for (const cx of [-2, -1, 0, 1]) {
            const l = generateChunk(w, cx, 1),
                r = generateChunk(w, cx + 1, 1);
            for (let y = 0; y < CHUNK; y++) {
                expect(l[y * CHUNK + 31]).toBe(
                    baseTile(DEFAULT_WORLD, cx * CHUNK + 31, 32 + y),
                );
                expect(r[y * CHUNK]).toBe(
                    baseTile(DEFAULT_WORLD, (cx + 1) * CHUNK, 32 + y),
                );
            }
        }
    });
    it("correctly addresses negative chunks and tile offsets", () => {
        expect(chunkOf(-1)).toBe(-1);
        expect(localOf(-1)).toBe(31);
        expect(chunkOf(-32)).toBe(-1);
        expect(localOf(-32)).toBe(0);
        expect(chunkOf(-33)).toBe(-2);
    });
    it("keeps spawn safe, guarantees the starter cave and bottom boundary", () => {
        for (let x = 6; x < 25; x++) {
            expect(baseTile(DEFAULT_WORLD, x, 21)).toBe(0);
            expect(baseTile(DEFAULT_WORLD, x, 22)).toBe(7);
        }
        expect(baseTile(DEFAULT_WORLD, 40, 24)).toBe(0);
        for (let x = -100; x < 100; x++)
            expect(baseTile(DEFAULT_WORLD, x, DEPTH - 1)).toBe(6);
        for (let x = -200; x < 200; x++)
            expect(
                Math.abs(
                    surface(DEFAULT_WORLD, x + 1) - surface(DEFAULT_WORLD, x),
                ),
            ).toBeLessThanOrEqual(2);
    });
    it("preserves mined and placed tiles through regeneration and serialized reopen", () => {
        const b = initialBundle(),
            w = b.worlds[b.active];
        editTile(w, -1, 35, 0);
        editTile(w, 32, 30, 7);
        generateChunk(w, 8, 2);
        const restored = JSON.parse(JSON.stringify(b));
        validateBundle(restored);
        expect(readTile(restored.worlds[b.active], -1, 35)).toBe(0);
        expect(readTile(restored.worlds[b.active], 32, 30)).toBe(7);
        expect(
            generateChunk(restored.worlds[b.active], -1, 1)[3 * 32 + 31],
        ).toBe(0);
    });
    it("guarantees harvestable timber and exposed iron across supported settings", () => {
        for (const seed of [
            "frontier",
            "negative-map",
            "strange planet",
            "123",
        ]) {
            for (const roughness of [0.6, 1, 1.4]) {
                const settings = { ...DEFAULT_WORLD, seed, roughness };
                expect(
                    harvestables(settings, 0).some(
                        (p) => p.x === 3 && p.kind === "tree",
                    ),
                ).toBe(true);
                for (let x = 27; x <= 32; x++) {
                    expect(baseTile(settings, x, 21)).toBe(0);
                    expect(baseTile(settings, x, 22)).toBe(3);
                }
            }
        }
    });
    it("owns every chest once and leaves its interaction point open", () => {
        const all = [
            ...landmarks(DEFAULT_WORLD, 1),
            ...landmarks(DEFAULT_WORLD, 2),
            ...landmarks(DEFAULT_WORLD, 3),
        ];
        expect(new Set(all.map((l) => l.id)).size).toBe(all.length);
        for (const l of all)
            expect(baseTile(DEFAULT_WORLD, l.x, l.y - 1)).toBe(0);
    });
});
describe("inventory and durable progression rules", () => {
    it("consumes recipe ingredients exactly once", () => {
        const w = newWorld("w", DEFAULT_WORLD);
        add(w.inventory, "iron", 4);
        craft(w, "bar", true);
        expect(count(w.inventory, "iron")).toBe(2);
        expect(count(w.inventory, "bar")).toBe(1);
        expect(() => craft(w, "staff", false)).toThrow();
    });
    it("keeps all ingredients if crafting output does not fit", () => {
        const w = newWorld("w", DEFAULT_WORLD);
        w.inventory = Array.from({ length: 32 }, () => ({
            id: "stone" as ItemId,
            count: 99,
        }));
        w.inventory[0] = { id: "iron", count: 99 };
        const before = structuredClone(w.inventory);
        expect(() => craft(w, "bar", true)).toThrow(/full/);
        expect(w.inventory).toEqual(before);
    });
    it("does not partially add inventory stacks on overflow", () => {
        const w = newWorld("w", DEFAULT_WORLD);
        w.inventory = Array.from({ length: 32 }, () => ({
            id: "stone" as ItemId,
            count: 99,
        }));
        w.inventory[0]!.count = 98;
        expect(add(w.inventory, "stone", 2)).toBe(false);
        expect(w.inventory[0]!.count).toBe(98);
    });
    it("charges a skin purchase once and preserves ownership", () => {
        const b = initialBundle(),
            w = b.worlds[b.active];
        w.coins = 100;
        unlock(b, "ranger");
        unlock(b, "ranger");
        expect(w.coins).toBe(40);
        expect(b.profile.owned.filter((id) => id === "ranger")).toHaveLength(1);
        expect(() => unlock(b, "knight")).toThrow();
        expect(w.coins).toBe(40);
    });
    it("prevents repeated chest and objective rewards", () => {
        const w = newWorld("w", DEFAULT_WORLD);
        chest(w, "landing-cache");
        expect(() => chest(w, "landing-cache")).toThrow();
        expect(w.coins).toBe(35);
        claim(w, "chest");
        expect(() => claim(w, "chest")).toThrow();
        expect(w.coins).toBe(80);
    });
    it("keeps chest closed and coins unchanged with a full pack", () => {
        const w = newWorld("w", DEFAULT_WORLD);
        w.inventory = Array.from({ length: 32 }, () => ({
            id: "stone" as ItemId,
            count: ITEMS.stone.stack,
        }));
        expect(() => chest(w, "cache")).toThrow();
        expect(w.opened).toEqual([]);
        expect(w.coins).toBe(0);
    });
    it("rejects incompatible and malformed saves without modifying them", () => {
        const b = initialBundle();
        b.version = 99;
        const before = JSON.stringify(b);
        expect(() => validateBundle(b)).toThrow(/unsupported/);
        expect(JSON.stringify(b)).toBe(before);
    });
});
describe("LLM analytics", () => {
    it("records structured events and derived summaries", () => {
        const w = newWorld("analytics", DEFAULT_WORLD);
        recordAnalytics(w, "session_start", {}, { sessionId: "s1" });
        recordAnalytics(w, "position_sample", {
            distance: 120,
            depth: 18,
            distanceFromBase: 240,
        });
        recordAnalytics(w, "attack_hit", {
            kind: "crawler",
            damage: 25,
            killed: true,
        });
        recordAnalytics(w, "mined", { material: "Stone" });
        expect(ensureAnalytics(w).summary).toMatchObject({
            sessions: 1,
            distance: 120,
            maxDepth: 18,
            maxDistanceFromBase: 240,
            kills: 1,
            mined: 1,
        });
        expect(w.analytics?.summary.killsByKind.crawler).toBe(1);
        expect(w.analytics?.events.map((e) => e.type)).toEqual([
            "session_start",
            "position_sample",
            "attack_hit",
            "mined",
        ]);
        const restored = JSON.parse(JSON.stringify(w));
        validateBundle({
            ...initialBundle(),
            worlds: { [w.id]: restored },
            active: w.id,
        });
        expect(restored.analytics.summary.damageDealt).toBe(25);
    });
    it("normalizes a legacy world and keeps raw events bounded", () => {
        const legacy = newWorld("legacy", DEFAULT_WORLD) as Partial<
            ReturnType<typeof newWorld>
        >;
        delete legacy.analytics;
        const bundle = initialBundle();
        bundle.worlds = { legacy: legacy as ReturnType<typeof newWorld> };
        bundle.active = "legacy";
        validateBundle(bundle);
        expect(bundle.worlds.legacy.analytics?.version).toBe(1);
        for (let i = 0; i < 10050; i++)
            recordAnalytics(bundle.worlds.legacy, "action_failed", {
                action: "test",
            });
        expect(bundle.worlds.legacy.analytics?.events).toHaveLength(10000);
        expect(bundle.worlds.legacy.analytics?.summary.failures).toBe(10050);
    });
});
import { approveWorldProposal } from "./ai";
describe("future AI boundary", () => {
    it("accepts only supported settings and discards extra fields", () => {
        expect(
            approveWorldProposal({ ...DEFAULT_WORLD, code: "not executable" }),
        ).toEqual(DEFAULT_WORLD);
        expect(() =>
            approveWorldProposal({ ...DEFAULT_WORLD, caves: 100 }),
        ).toThrow();
        expect(() => approveWorldProposal(null)).toThrow();
    });
});
