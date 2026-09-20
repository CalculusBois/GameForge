import { describe, it, expect } from 'vitest';
import { DEFAULT_CONFIG, validateConfig } from './config';
import { generateRoom, validateRoom, templateFor } from './rooms';
describe('platformer generation', () => {
    it('is reproducible and produces reachable routes across 100 rooms', () => { for (let i = 0; i < 100; i++) {
        const a = generateRoom(i, DEFAULT_CONFIG);
        expect(a).toEqual(generateRoom(i, DEFAULT_CONFIG));
        expect(validateRoom(a, DEFAULT_CONFIG)).toBe(true);
    } });
    it('does not repeat templates immediately', () => { for (let i = 1; i < 100; i++)
        expect(templateFor('ASTRA', i)).not.toBe(templateFor('ASTRA', i - 1)); });
    it('bounds invalid retries and uses the authored fallback', () => { let calls = 0; const r = generateRoom(8, DEFAULT_CONFIG, () => { calls++; return { ...generateRoom(0, DEFAULT_CONFIG), route: [] }; }); expect(calls).toBe(3); expect(r.name).toBe('Arrival bay'); expect(r.index).toBe(8); });
    it('rejects unreachable routes and wall spawns', () => { const r = generateRoom(0, DEFAULT_CONFIG); r.surfaces[1].y = 50; expect(validateRoom(r, DEFAULT_CONFIG)).toBe(false); const b = generateRoom(0, DEFAULT_CONFIG); b.spawn.y = 500; expect(validateRoom(b, DEFAULT_CONFIG)).toBe(false); });
    it('rejects unsupported movement', () => { expect(() => validateConfig({ ...DEFAULT_CONFIG, movement: { ...DEFAULT_CONFIG.movement, speed: 2000 } })).toThrow(); });
});
describe('template coverage', () => {
    it('validates every authored template without silently falling back', () => { const names = new Set<string>(); for (let i = 0; i < 6; i++) {
        const room = makeRoom(i, DEFAULT_CONFIG);
        expect(validateRoom(room, DEFAULT_CONFIG), JSON.stringify(room)).toBe(true);
        names.add(room.name);
    } expect(names.size).toBe(6); });
    it('validates seeded endless candidates and bounds enemy density', () => { for (const seed of ['ASTRA-01', 'SECOND', '123'])
        for (let i = 0; i < 100; i++) {
            const c = { ...DEFAULT_CONFIG, generation: { ...DEFAULT_CONFIG.generation, mode: 'endless' as const, seed } };
            const room = makeRoom(i, c);
            expect(validateRoom(room, c), JSON.stringify(room)).toBe(true);
            expect(room.enemies.length).toBeLessThanOrEqual(c.difficulty.densityCap);
            expect(generateRoom(i, c)).toEqual(generateRoom(i, c));
        } });
});
import { makeRoom } from './rooms';
