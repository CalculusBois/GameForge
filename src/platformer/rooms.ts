import { DEFAULT_CONFIG, type GameConfig, type EnemyKind } from './config';
export interface Surface {
    x: number;
    y: number;
    w: number;
    h: number;
    oneWay?: boolean;
}
export interface Room {
    index: number;
    name: string;
    width: number;
    height: number;
    surfaces: Surface[];
    route: number[];
    spawn: {
        x: number;
        y: number;
    };
    exit: {
        x: number;
        y: number;
    };
    core: {
        x: number;
        y: number;
    };
    spikes: {
        x: number;
        y: number;
        w: number;
    }[];
    enemies: {
        kind: EnemyKind;
        x: number;
        y: number;
    }[];
    recovery: boolean;
    rewards: {
        x: number;
        y: number;
        value: number;
    }[];
}
const names = ['Arrival bay', 'Broken conduit', 'Drone foundry', 'Ascension shaft', 'Relic chamber', 'Sanctuary'];
export function seeded(seed: string, index: number) { let h = 2166136261; for (const c of `${seed}:${index}`)
    h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return (h >>> 0) / 4294967296; }; }
export function templateFor(seed: string, index: number) { if (index === 0)
    return 0; if (index % 5 === 4)
    return 5; const r = seeded(seed, 0); const offset = Math.floor(r() * 4); return 1 + (index + offset) % 4; }
export function makeRoom(index: number, c: GameConfig, attempt = 0): Room {
    const rnd = seeded(c.generation.seed, index + attempt * 100003), t = c.generation.mode === 'demo' ? index % 6 : templateFor(c.generation.seed, index), recovery = t === 5;
    const rise = t === 3 ? 65 : t === 1 ? 60 : 40;
    const surfaces: Surface[] = [{ x: 0, y: 480, w: 470, h: 150 }, { x: 540, y: 480 - rise, w: 260, h: 200 }, { x: 870, y: 480 - rise * 2, w: 260, h: 300 }, { x: 1200, y: 480 - rise, w: 280, h: 300 }, { x: 1540, y: 480, w: 700, h: 150 }];
    if (t === 0) {
        surfaces[1].y = 440;
        surfaces[2].y = 400;
        surfaces[3].y = 440;
    }
    // Six authored profiles; seeded offsets stay within the traversal envelope.
    if (t === 2) {
        surfaces[1].y = 465;
        surfaces[2].y = 435;
        surfaces[3].y = 465;
    }
    if (t === 4) {
        surfaces[1].y = 425;
        surfaces[2].y = 370;
        surfaces[3].y = 425;
    }
    if (t === 5) {
        surfaces[0].w = 560;
        surfaces[1] = { x: 560, y: 465, w: 310, h: 180 };
        surfaces[2] = { x: 870, y: 450, w: 330, h: 200 };
        surfaces[3] = { x: 1200, y: 465, w: 340, h: 200 };
    }
    if (index > 0 && t !== 5)
        for (let i = 1; i < 4; i++) {
            surfaces[i].x += Math.floor(rnd() * 17) - 8;
            surfaces[i].y += Math.floor(rnd() * 9) - 4;
        }
    surfaces.push({ x: 230, y: 390, w: 150, h: 16, oneWay: true }, { x: 1630, y: 390, w: 180, h: 16, oneWay: true });
    if (t === 2 || t === 4)
        surfaces.push({ x: 930, y: surfaces[2].y - 85, w: 160, h: 16, oneWay: true });
    const enemies: Room['enemies'] = recovery ? [] : [{ kind: 'walker', x: 1370, y: surfaces[3].y - 22 }];
    if (index > 0 && !recovery)
        enemies.push({ kind: 'drone', x: 1020, y: surfaces[2].y - 95 }, { kind: 'turret', x: 1860, y: 458 });
    if (index > 7 && !recovery && c.difficulty.densityCap > 3)
        enemies.push({ kind: 'walker', x: 1730 + Math.floor(rnd() * 80), y: 458 });
    return { index, name: names[t], width: 2240, height: 640, surfaces, route: [0, 1, 2, 3, 4], spawn: { x: 100, y: 458 }, exit: { x: 2110, y: 450 }, core: { x: 1010, y: surfaces[2].y - 40 }, spikes: recovery ? [] : [{ x: 1590, y: 480, w: 48 }], enemies: enemies.slice(0, c.difficulty.densityCap), recovery, rewards: t === 4 ? [{ x: 650, y: surfaces[1].y - 32, value: 100 }, { x: 1320, y: surfaces[3].y - 32, value: 100 }] : index > 0 ? [{ x: 1700 + Math.floor(rnd() * 130), y: 448, value: 50 }] : [] };
}
export function validateRoom(r: Room, c: GameConfig): boolean {
    if (!r.surfaces.length || r.route.length < 2 || !Number.isFinite(r.width) || !Number.isFinite(r.height))
        return false;
    if (r.surfaces.some(s => ![s.x, s.y, s.w, s.h].every(Number.isFinite) || s.w < 24 || s.h < 8 || s.x < 0 || s.x + s.w > r.width))
        return false;
    const m = c.movement, maxRise = m.jump * m.jump / (2 * m.gravity);
    const support = (p: {
        x: number;
        y: number;
    }) => r.surfaces.some(s => p.x > s.x + 16 && p.x < s.x + s.w - 16 && p.y <= s.y && s.y - p.y <= 70);
    if (!support(r.spawn) || !support(r.exit) || !support(r.core) || r.rewards.some(p => !support(p)))
        return false;
    const inside = (p: {
        x: number;
        y: number;
    }) => r.surfaces.some(s => !s.oneWay && p.x + 12 > s.x && p.x - 12 < s.x + s.w && p.y + 16 > s.y && p.y - 18 < s.y + s.h);
    if (inside(r.spawn) || inside(r.exit) || inside(r.core) || r.rewards.some(inside))
        return false;
    if (r.enemies.some(e => Math.abs(e.x - r.spawn.x) < 180 || Math.abs(e.x - r.exit.x) < 100 || inside(e)))
        return false;
    for (let i = 1; i < r.route.length; i++) {
        const a = r.surfaces[r.route[i - 1]], b = r.surfaces[r.route[i]];
        if (!a || !b || b.w < 100)
            return false;
        const rise = a.y - b.y;
        if (rise > maxRise - 25)
            return false;
        const disc = m.jump * m.jump - 2 * m.gravity * rise;
        if (disc < 0)
            return false;
        const flight = (m.jump + Math.sqrt(disc)) / m.gravity;
        const gap = b.x - (a.x + a.w);
        if (gap + 64 > m.speed * flight * .8)
            return false;
    }
    // Required pickup and door must be supported by the connected route, not an isolated ledge.
    for (const p of [r.core, r.exit])
        if (!r.route.some(i => { const s = r.surfaces[i]; return p.x > s.x + 16 && p.x < s.x + s.w - 16 && p.y < s.y && s.y - p.y < 70; }))
            return false;
    for (const i of r.route) {
        const p = r.surfaces[i];
        if (r.surfaces.some((s, j) => j !== i && !s.oneWay && s.x < p.x + p.w && s.x + s.w > p.x && s.y < p.y && s.y + s.h > p.y - 70))
            return false;
    }
    return !r.spikes.some(s => Math.abs(r.spawn.x - s.x) < s.w + 30 || Math.abs(r.exit.x - s.x) < s.w + 30);
}
export function generateRoom(index: number, c: GameConfig, factory = makeRoom): Room { for (let n = 0; n < 3; n++) {
    const r = factory(index, c, n);
    if (validateRoom(r, c))
        return r;
} const fallback = makeRoom(0, DEFAULT_CONFIG); fallback.index = index; if (!validateRoom(fallback, c))
    throw new Error('Movement cannot traverse fallback'); return fallback; }
