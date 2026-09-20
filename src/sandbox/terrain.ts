import { bossSites } from './bossSites';
import { baseTile as legacyBaseTile } from './terrain-v1';
import { CHUNK, DEPTH, TILE, WORLD_LIMIT, MATERIALS, type Biome, type Material, type WorldSave, type WorldSettings } from './model';
export const chunkOf = (n: number) => Math.floor(n / CHUNK);
export const localOf = (n: number) => ((n % CHUNK) + CHUNK) % CHUNK;
export const chunkKey = (x: number, y: number) => `${chunkOf(x)},${chunkOf(y)}`;
export const tileKey = (x: number, y: number) => `${localOf(x)},${localOf(y)}`;
export function hash(seed: string, x: number, y: number, stream = 'terrain') { let h = 2166136261; for (const c of `${seed}/${stream}/${x}/${y}`)
    h = Math.imul(h ^ c.charCodeAt(0), 16777619); h ^= h >>> 16; h = Math.imul(h, 2246822507); h ^= h >>> 13; return (h >>> 0) / 4294967296; }
const smooth = (v: number) => v * v * (3 - 2 * v);
export function noise(seed: string, x: number, y: number, stream: string) { const ix = Math.floor(x), iy = Math.floor(y), fx = smooth(x - ix), fy = smooth(y - iy), a = hash(seed, ix, iy, stream), b = hash(seed, ix + 1, iy, stream), c = hash(seed, ix, iy + 1, stream), d = hash(seed, ix + 1, iy + 1, stream); return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy; }
export function surface(s: WorldSettings, x: number) {
    if (x >= -22 && x <= 40)
        return 22;
    let h = 22
        + (noise(s.seed, x / 100, 0, 'height') - .5) * 18 * s.roughness
        + Math.sin(x / 33) * 3
        + (noise(s.seed, x / 310, 0, 'mountain') - .5) * 14 * s.roughness;
    // Tall peaks: gentle approach on one face, cliff on the other — build or path around.
    const period = 210;
    const region = Math.floor(x / period);
    for (let i = -1; i <= 1; i++) {
        const r = region + i;
        const center = r * period + Math.floor(hash(s.seed, r, 0, 'peak') * 90) + 48;
        if (center > -100 && center < 120)
            continue;
        const peak = Math.round((26 + hash(s.seed, r, 1, 'peak-h') * 22) * Math.min(1.25, s.roughness));
        const left = 16 + Math.floor(hash(s.seed, r, 2, 'peak-l') * 20);
        const right = Math.max(5, Math.ceil(peak / 8));
        const dx = x - center;
        let rise = 0;
        if (dx <= 0 && -dx <= left)
            rise = peak * (1 + dx / left);
        else if (dx > 0 && dx <= right)
            rise = peak * (1 - dx / right);
        if (rise > 0)
            h -= rise;
    }
    const blend = Math.min(1, Math.max(0, x > 40 ? (x - 40) / 35 : (-22 - x) / 35));
    return Math.max(2, Math.round(22 + (h - 22) * blend));
}
export function biome(s: WorldSettings, x: number, y: number): Biome {
    const top = surface(s, x);
    // Deep mantle: Ashen depths (volcanic magma & obsidian crusts)
    if (y > top + 65 || y >= 95) {
        return 'Ashen depths';
    }
    // Mid cavern: Fungal hollows and Crystal depths
    if (y > top + 26) {
        const cavernNoise = noise(s.seed, x / 70, y / 50, 'cavern_biome');
        return cavernNoise > 0.48 ? 'Crystal depths' : 'Fungal hollows';
    }
    // Surface biomes: starter area safe at spawn
    if (Math.abs(x) < 85) {
        return 'Verdant frontier';
    }
    // Outside starter area: smoothly alternate between Verdant, Rust wastes, and Frost highlands
    const h1 = Math.sin(x / 140 + hash(s.seed, 0, 0, 'biome') * 3);
    const h2 = Math.cos(x / 180 + hash(s.seed, 1, 0, 'frost') * 2);
    if (h2 > 0.35) {
        return 'Frost highlands';
    }
    if (h1 > 0.05) {
        return 'Rust wastes';
    }
    return 'Verdant frontier';
}
export const nearCave = (x: number) => 22 + (x - 36) * .45;
export function caveAxis(s: WorldSettings, x: number) { return surface(s, x) + 17 + Math.sin(x / 19) * 4; }
export interface Landmark {
    id: string;
    x: number;
    y: number;
    kind: 'chest' | 'shrine';
}
export function restChestY(s: WorldSettings, x: number, hintY: number): number {
    const start = Math.max(1, Math.min(DEPTH - 4, Math.floor(hintY)));
    const isGround = (ty: number) => {
        const t = baseTile(s, x, ty);
        return t !== 0 && t !== 23;
    };
    for (let ty = start; ty < DEPTH - 2; ty++) {
        if (isGround(ty) && !isGround(ty - 1) && baseTile(s, x, ty - 1) !== 23) return ty;
    }
    for (let ty = start; ty >= 2; ty--) {
        if (isGround(ty) && !isGround(ty - 1) && baseTile(s, x, ty - 1) !== 23) return ty;
    }
    return Math.max(2, surface(s, x));
}
export function landmarks(s: WorldSettings, cx: number): Landmark[] { const min = cx * CHUNK, max = min + CHUNK, out: Landmark[] = []; for (let owner = Math.floor(min / 128) - 1; owner <= Math.floor(max / 128); owner++) {
    const x = owner * 128 + 78;
    if (x >= min && x < max)
        out.push({ id: `chest:${owner}`, x, y: restChestY(s, x, Math.floor(caveAxis(s, x)) + 2), kind: 'chest' });
} if (70 >= min && 70 < max)
    out.push({ id: 'landing-cache', x: 70, y: restChestY(s, 70, Math.floor(nearCave(70)) + 2), kind: 'chest' });
    for (let owner = Math.floor(min / 72) - 1; owner <= Math.floor(max / 72); owner++) {
        const x = owner * 72 + 18 + Math.floor(hash(s.seed, owner, 0, 'surface-chest') * 28);
        if (x < min || x >= max || x >= -8 && x <= 40) continue;
        if (hash(s.seed, owner, 1, 'surface-chest') < 0.42) continue;
        out.push({ id: `surface-chest:${owner}`, x, y: restChestY(s, x, surface(s, x)), kind: 'chest' });
    }
    return out; }
export function baseTile(s: WorldSettings, x: number, y: number): Material {
    if (y >= DEPTH - 2 || Math.abs(x) >= WORLD_LIMIT)
        return 6;
    if (y < 0)
        return 0;
    for (const site of bossSites(s)) {
        if (Math.abs(x-site.x) <= 17 && y >= site.floor-16 && y <= site.floor+1) {
            if (y >= site.floor) return 2;
            return 0;
        }
    }
    // Each deep 40×16 cell owns at most one finite basin, with a solid lip and floor.
    // Mining its walls never creates new liquid cells.
    if (y >= 115 && y < DEPTH - 3) {
        const cellX = Math.floor(x / 40), cellY = Math.floor(y / 16);
        const ax = cellX * 40 + 10 + Math.floor(hash(s.seed, cellX, cellY, 'basin-x') * 20);
        const floor = cellY * 16 + 10;
        if (hash(s.seed, cellX, cellY, 'basin') < .8 && Math.abs(x-ax) <= 5 && y >= floor-4 && y <= floor+1) {
            if (y === floor+1 || Math.abs(x-ax) === 5) return 2;
            if (y >= floor-1) return 23;
            return 0;
        }
    }
    const top = surface(s, x);
    if (y < top)
        return 0;
    // Outpost foundation and first learning area are protected from cave generation.
    if (x >= 0 && x <= 25 && y >= 22 && y < 25)
        return 7;
    // Accessible starter copper/coal: eight ore tiles permit the first upgrade.
    if (x >= 27 && x <= 34 && y === 22) return 10;
    if (x >= -7 && x <= -3 && y === 22) return 11;
    const starterTunnel = x >= 36 && x <= 100 && Math.abs(y - nearCave(x)) < 3;
    const owner = Math.floor((x - 78 + 64) / 128), anchor = owner * 128 + 78;
    const chamber = Math.abs(x - anchor) < 8 && Math.abs(y - caveAxis(s, anchor)) < 4;
    const connected = Math.abs(y - caveAxis(s, x)) < 2.6;
    const lowerTunnel = y > top + 30 && Math.abs(y - (75 + Math.sin(x / 25) * 9)) < 3;
    const connector = Math.abs(Math.sin(x / 31 + y / 27)) < .075 && y > top + 14;
    const cave = y > top + 5 && (noise(s.seed, x / 15, y / 12, 'caves') > .69 - (s.caves - 1) * .07 || connected || chamber || lowerTunnel || connector);
    if (starterTunnel)
        return 0;
    if (cave) {
        return 0;
    }
    if (x >= 27 && x <= 32 && y >= 22 && y <= 25)
        return 3;
    if (x >= 47 && x <= 50 && y >= 31 && y <= 34)
        return 4;
    if (x >= 33 && x <= 36 && y === 24)
        return 2;
    const b = biome(s, x, y), ore = noise(s.seed, x / 3, y / 3, 'resources');
    if (y > top + 3 && ore > .73 - (s.abundance - 1) * .05) {
        const depth = y - top;
        const oreType = noise(s.seed, x / 7, y / 7, 'ore_type');
        if (depth < 25) {
            if (b === 'Rust wastes') {
                return oreType < .5 ? 5 : oreType < .8 ? 3 : 10;
            }
            if (b === 'Frost highlands') {
                return oreType < .45 ? 12 : oreType < .75 ? 10 : 11;
            }
            return oreType < .45 ? 10 : oreType < .75 ? 11 : 3;
        } else if (depth < 60) {
            if (b === 'Rust wastes') {
                return oreType < .4 ? 5 : oreType < .7 ? 3 : 12;
            }
            if (b === 'Fungal hollows') {
                return oreType < .35 ? 13 : oreType < .65 ? 11 : 4;
            }
            if (b === 'Crystal depths') {
                return depth >= 40 && oreType > .8 ? 16 : oreType < .35 ? 4 : oreType < .65 ? 12 : 13;
            }
            return oreType < .35 ? 3 : oreType < .6 ? 11 : oreType < .85 ? 12 : 13;
        } else {
            if (b === 'Ashen depths') {
                return oreType < .35 ? 14 : oreType < .7 ? 15 : 13;
            }
            if (b === 'Crystal depths') {
                return oreType < .4 ? 4 : oreType < .65 ? 16 : oreType < .85 ? 13 : 14;
            }
            return oreType < .3 ? 13 : oreType < .6 ? 14 : oreType < .85 ? 15 : 12;
        }
    }
    if (y === top) {
        const peakRise = Math.max(0, 24 - top);
        if (peakRise > 14) return 2; // rocky mountain summit — visible skyline
        if (b === 'Rust wastes') return 2;
        if (b === 'Frost highlands') return 2;
        return 9;
    }
    if (y < top + 4) {
        const peakRise = Math.max(0, 24 - top);
        return peakRise > 10 && y < top + 2 ? 2 : 1;
    }
    return 2;
}
export function readTile(w: WorldSave, x: number, y: number): Material { return w.edits[chunkKey(x, y)]?.[tileKey(x, y)] ?? (w.generator === 1 ? legacyBaseTile(w.settings, x, y) : baseTile(w.settings, x, y)); }
export function editTile(w: WorldSave, x: number, y: number, material: Material) { if (y < 0 || y >= DEPTH - 2 || Math.abs(x) >= WORLD_LIMIT)
    throw new Error('Beyond the supported world boundary.'); const key = chunkKey(x, y); w.edits[key] ??= {}; w.edits[key][tileKey(x, y)] = material; }
export function generateChunk(w: WorldSave, cx: number, cy: number) { const tiles: Material[] = []; for (let y = 0; y < CHUNK; y++)
    for (let x = 0; x < CHUNK; x++)
        tiles.push(readTile(w, cx * CHUNK + x, cy * CHUNK + y)); return tiles; }
export function solid(w: WorldSave, x: number, y: number) { return MATERIALS[readTile(w, x, y)].solid; }
export function clearLine(w: WorldSave, ax: number, ay: number, bx: number, by: number, ignoreEnd = false) { const dx = bx - ax, dy = by - ay, steps = Math.ceil(Math.hypot(dx, dy) / 6); for (let i = 1; i <= steps; i++) {
    const x = Math.floor((ax + dx * i / steps) / TILE), y = Math.floor((ay + dy * i / steps) / TILE);
    if (ignoreEnd && x === Math.floor(bx / TILE) && y === Math.floor(by / TILE))
        continue;
    if (solid(w, x, y))
        return false;
} return true; }
export type Harvest = {
    id: string;
    x: number;
    y: number;
    kind: 'tree' | 'herb' | 'scrap';
};
/** Hold-E gather durations (ms). Trees are slower / harder. */
export const HARVEST_MS: Record<Harvest['kind'], number> = {
    tree: 1200,
    herb: 700,
    scrap: 900,
};
export function harvestables(s: WorldSettings, cx: number) { const out: Harvest[] = []; for (let x = cx * CHUNK; x < (cx + 1) * CHUNK; x++) {
    const y = surface(s, x);
    if (x >= 8 && x <= 23)
        continue;
    if ((x === 3 || x === 30 || hash(s.seed, x, 0, 'decoration') > .92) && baseTile(s, x, y) !== 0) {
        const b = biome(s, x, y);
        out.push({ id: `plant:${x}`, x, y, kind: x === 3 ? 'tree' : x === 30 ? 'herb' : b === 'Rust wastes' ? 'scrap' : hash(s.seed, x, 1, 'decoration') > .65 ? 'herb' : 'tree' });
    }
} return out; }
/** Mark gatherables destroyed when the block they sit on is removed. */
export function clearUnsupportedHarvest(w: WorldSave, tiles: Array<[number, number]>) {
    if (!tiles.length) return [] as Harvest[];
    const hit = new Set(tiles.map(([x, y]) => `${x},${y}`));
    const removed: Harvest[] = [];
    const chunks = new Set(tiles.map(([x]) => chunkOf(x)));
    for (const cx of chunks) {
        for (const p of harvestables(w.settings, cx)) {
            if (w.harvested.includes(p.id) || !hit.has(`${p.x},${p.y}`)) continue;
            w.harvested.push(p.id);
            removed.push(p);
        }
    }
    return removed;
}
/** Drop any plant whose supporting tile is no longer solid (trees with no ground under them). */
export function sweepUnsupportedHarvest(w: WorldSave, aroundX: number, radiusChunks = 2) {
    const removed: Harvest[] = [];
    const cx0 = chunkOf(aroundX);
    for (let cx = cx0 - radiusChunks; cx <= cx0 + radiusChunks; cx++) {
        for (const p of harvestables(w.settings, cx)) {
            if (w.harvested.includes(p.id)) continue;
            if (solid(w, p.x, p.y)) continue;
            w.harvested.push(p.id);
            removed.push(p);
        }
    }
    return removed;
}
export function protectedTile(x: number, y: number) { return x >= 6 && x <= 24 && y >= 18 && y <= 24; }
export const OUTPOST_X = 16 * TILE;
export const OUTPOST_Y = 22 * TILE;
export function inOutpost(px: number, py: number, pad = 0) {
    return Math.abs(px - OUTPOST_X) < 320 + pad && Math.abs(py - OUTPOST_Y) < 140 + pad;
}

export function rustWeight(s:WorldSettings,x:number){if(Math.abs(x)<100)return 0;return Math.max(0,Math.min(1,(Math.sin(x/180+hash(s.seed,0,0,'biome')*2)+.1)/.4));}

/**
 * Mathematical ground check against terrain tilemap.
 * Locates the nearest solid ground tile below the given starting coordinate
 * and returns the exact pixel Y coordinate of its top surface.
 */
export function findGroundY(w: WorldSave, tx: number, startTy?: number): number {
    const baseTy = startTy !== undefined ? startTy : surface(w.settings, tx);
    const scanStart = Math.max(1, baseTy - 2);
    // Scan downwards for the first solid tile that has open space above it
    for (let ty = scanStart; ty < DEPTH - 2; ty++) {
        if (solid(w, tx, ty) && !solid(w, tx, ty - 1)) {
            return ty * TILE;
        }
    }
    // Upwards scan if start was below ground
    for (let ty = scanStart - 1; ty >= 1; ty--) {
        if (solid(w, tx, ty) && !solid(w, tx, ty - 1)) {
            return ty * TILE;
        }
    }
    // Fallback to surface math
    return surface(w.settings, tx) * TILE;
}

/**
 * Calculates the safe surface spawn Y coordinate for an entity of given height,
 * completely avoiding floor clipping by instantiating at ground_Y - (height / 2) - 0.1
 * (in 2D downward screen coordinates, placing the bottom edge exactly 0.1px above ground_Y,
 * equivalent to ground_Y + (height / 2) + 0.1 in upward-Y physics space).
 */
export function calculateSafeSurfaceSpawnY(ground_Y: number, height: number, isFlying: boolean = false): number {
    if (isFlying) {
        return ground_Y - height - 80;
    }
    return ground_Y - (height / 2) - 0.1;
}
