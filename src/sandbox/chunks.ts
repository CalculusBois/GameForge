import Phaser from 'phaser';
import { CHUNK, TILE, DEPTH, MATERIALS, type WorldSave } from './model';
import { generateChunk, hash, readTile, surface, harvestables, landmarks, biome, rustWeight, localOf } from './terrain';
interface ActiveChunk {
    graphic: Phaser.GameObjects.Graphics;
    back: Phaser.GameObjects.Graphics;
    bodies: Phaser.GameObjects.Rectangle[];
}
export class ChunkManager {
    active = new Map<string, ActiveChunk>();
    pending: string[] = [];
    terrain: Phaser.Physics.Arcade.StaticGroup;
    radius = 2;
    private cache = new Map<string, ReturnType<typeof generateChunk>>();
    private scene: Phaser.Scene;
    private world: () => WorldSave;
    constructor(scene: Phaser.Scene, world: () => WorldSave) { this.scene = scene; this.world = world; this.terrain = scene.physics.add.staticGroup(); }
    get bodyCount() { return this.terrain.getLength(); }
    has(cx: number, cy: number) { return this.active.has(`${cx},${cy}`); }
    ensure(px: number, py: number) { const cx = Math.floor(px / (CHUNK * TILE)), cy = Math.floor(py / (CHUNK * TILE)); const desired = new Set<string>(); for (let dy = -1; dy <= 1; dy++)
        for (let dx = -this.radius; dx <= this.radius; dx++) {
            const y = cy + dy;
            if (y < 0 || y >= Math.ceil(DEPTH / CHUNK))
                continue;
            desired.add(`${cx + dx},${y}`);
        } for (const key of this.active.keys())
        if (!desired.has(key))
            this.unload(key);
        // Graphics command buffers are not automatically culled like bounded sprites.
        // Keep collision preloaded, but draw only chunks near the camera.
        const view = this.scene.cameras.main.worldView, margin = 160, size = CHUNK * TILE;
        for (const [key, chunk] of this.active) {
            const [x, y] = key.split(',').map(Number);
            const visible = x * size < view.right + margin && (x + 1) * size > view.left - margin && y * size < view.bottom + margin && (y + 1) * size > view.top - margin;
            chunk.graphic.setVisible(visible); chunk.back.setVisible(visible);
        }
        this.pending = [...desired].filter(k => !this.active.has(k)).sort((a, b) => { const [ax, ay] = a.split(',').map(Number), [bx, by] = b.split(',').map(Number); return Math.abs(ax - cx) + Math.abs(ay - cy) - Math.abs(bx - cx) - Math.abs(by - cy); }); }
    step() { const key = this.pending.shift(); if (key)
        this.build(key); }
    ready(px: number, py: number) { const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE); for (const dx of [-2, 0, 2])
        for (const dy of [-3, 0, 3]) {
            const cy = Math.floor((ty + dy) / CHUNK);
            if (cy >= 0 && !this.has(Math.floor((tx + dx) / CHUNK), cy))
                return false;
        } return true; }
    private unload(key: string) { const c = this.active.get(key); if (!c)
        return; c.graphic.destroy(); c.back.destroy(); for (const b of c.bodies) {
        this.terrain.remove(b, true, true);
    } this.active.delete(key); }
    invalidate(tx: number, ty: number) {
        const cx = Math.floor(tx / CHUNK), cy = Math.floor(ty / CHUNK);
        const keys = [`${cx},${cy}`];
        if (localOf(tx) === 0) keys.push(`${cx - 1},${cy}`);
        if (localOf(tx) === CHUNK - 1) keys.push(`${cx + 1},${cy}`);
        if (localOf(ty) === 0) keys.push(`${cx},${cy - 1}`);
        if (localOf(ty) === CHUNK - 1) keys.push(`${cx},${cy + 1}`);
        for (const key of keys) {
            this.cache.delete(key);
            if (this.active.has(key)) { this.unload(key); this.build(key); }
        }
    }
    refreshDecor(tx?: number, ty?: number) {
        const keys = tx === undefined || ty === undefined ? [...this.active.keys()] : [`${Math.floor(tx / CHUNK)},${Math.floor(ty / CHUNK)}`];
        for (const key of keys) if (this.active.has(key)) { this.unload(key); this.build(key); }
    }
    private build(key: string) {
        const [cx, cy] = key.split(',').map(Number), w = this.world();
        let tiles = this.cache.get(key);
        if (!tiles) {
            tiles = generateChunk(w, cx, cy);
            this.cache.set(key, tiles);
            if (this.cache.size > 40)
                this.cache.delete(this.cache.keys().next().value!);
        }
        const ruins = this.scene.add.graphics().setDepth(.5);
        const g = this.scene.add.graphics().setDepth(1), bodies: Phaser.GameObjects.Rectangle[] = [];
        const runs: {
            x: number;
            y: number;
            w: number;
            h: number;
        }[] = [];
        let previous = new Map<string, number>();
        for (let ly = 0; ly < CHUNK; ly++) {
            const current = new Map<string, number>();
            for (let lx = 0; lx < CHUNK; lx++) {
                const x = cx * CHUNK + lx, y = cy * CHUNK + ly, px = x * TILE, py = y * TILE, mat = tiles[ly * CHUNK + lx];
                if (y < 0 || y >= DEPTH)
                    continue;
                if (mat === 0 || mat === 8) {
                    if (y > surface(w.settings, x) + 3) {
                        ruins.fillStyle(biome(w.settings, x, y) === 'Crystal depths' ? 0x24223c : 0x202d35);
                        ruins.fillRect(px, py, TILE, TILE);
                        ruins.fillStyle(0x34404a, .3);
                        ruins.fillRect(px + 3, py + 3, 18, 1);
                    }
                    if (mat === 8) {
                        g.fillStyle(0x94714c);
                        g.fillRect(px + 10, py + 8, 4, 14);
                        g.fillStyle(0xffd18a);
                        g.fillCircle(px + 12, py + 7, 5);
                    }
                    continue;
                }
                const tint = hash(w.settings.seed, x, y, 'tile') > .5 ? 8 : 0;
                let color=MATERIALS[mat].color + tint * 0x010101;
                if(mat===1||mat===9){const blend=rustWeight(w.settings,x),to=mat===9?0x987f61:0x856047;const from=Phaser.Display.Color.IntegerToColor(color),target=Phaser.Display.Color.IntegerToColor(to);const mixed=Phaser.Display.Color.Interpolate.ColorWithColor(from,target,100,blend*100);color=Phaser.Display.Color.GetColor(mixed.r,mixed.g,mixed.b);}
                g.fillStyle(color);
                g.fillRect(px, py, TILE, TILE);
                g.fillStyle(0x122330, .25);
                g.fillRect(px + 4, py + 14, 10, 2);
                g.fillRect(px + 17, py + 4, 4, 3);
                if (!MATERIALS[readTile(w, x, y - 1)].solid) {
                    g.fillStyle(mat === 9 ? 0x88b878 : mat === 4 ? 0xba99f1 : 0x8c9b9f);
                    g.fillRect(px, py, TILE, 3);
                }
                if (!MATERIALS[readTile(w, x - 1, y)].solid) {
                    g.fillStyle(0xadc0c6, .25);
                    g.fillRect(px, py, 2, TILE);
                }
                if ([3, 4, 5].includes(mat)) {
                    g.fillStyle(mat === 4 ? 0xc5a4ff : mat === 3 ? 0xe5b891 : 0xbb9f72);
                    g.fillRect(px + 5, py + 5, 6, 5);
                    g.fillRect(px + 15, py + 13, 5, 6);
                }
            }
            for (let lx = 0; lx < CHUNK;) {
                if (!MATERIALS[tiles[ly * CHUNK + lx]].solid) {
                    lx++;
                    continue;
                }
                const start = lx;
                while (lx < CHUNK && MATERIALS[tiles[ly * CHUNK + lx]].solid)
                    lx++;
                const id = `${start}:${lx - start}`;
                const above = previous.get(id);
                if (above !== undefined) {
                    runs[above].h++;
                    current.set(id, above);
                }
                else {
                    current.set(id, runs.length);
                    runs.push({ x: start, y: ly, w: lx - start, h: 1 });
                }
            }
            previous = current;
        }
        for (const r of runs) {
            const body = this.scene.add.rectangle((cx * CHUNK + r.x + r.w / 2) * TILE, (cy * CHUNK + r.y + r.h / 2) * TILE, r.w * TILE, r.h * TILE, 0xffffff, 0);
            this.scene.physics.add.existing(body, true);
            this.terrain.add(body);
            bodies.push(body);
        }
        for (const p of harvestables(w.settings, cx)) {
            if (Math.floor((p.y - 1) / CHUNK) !== cy || w.harvested.includes(p.id))
                continue;
            const x = p.x * TILE, y = p.y * TILE;
            if (p.kind === 'tree') {
                g.fillStyle(0x755c4d);
                g.fillRect(x + 8, y - 80, 9, 80);
                g.fillStyle(0x4c7965);
                g.fillEllipse(x + 12, y - 85, 70, 48);
                g.fillStyle(0x7f9c70);
                g.fillEllipse(x + 1, y - 100, 48, 35);
            }
            else if (p.kind === 'herb') {
                g.fillStyle(0x98c997);
                g.fillTriangle(x, y, x + 10, y - 20, x + 13, y);
                g.fillStyle(0xf4b8ce);
                g.fillCircle(x + 10, y - 20, 4);
            }
            else {
                g.fillStyle(0x927966);
                g.fillRect(x, y - 18, 24, 18);
                g.fillStyle(0xc6aaa0);
                g.fillRect(x + 4, y - 24, 12, 10);
            }
        }
        for (const l of landmarks(w.settings, cx)) {
            if (Math.floor(l.y / CHUNK) !== cy)
                continue;
            const x = l.x * TILE, y = l.y * TILE;
            // The anchor chunk owns the entire background ruin, even across a border.
            ruins.fillStyle(0x263b47, .7);
            ruins.fillRect(x - 120, y - 116, 240, 128);
            ruins.lineStyle(3, 0x587480, .65);
            ruins.strokeRect(x - 120, y - 116, 240, 128);
            ruins.fillStyle(0x638b8d, .65);
            ruins.fillRect(x - 100, y - 100, 10, 110);
            ruins.fillRect(x + 92, y - 100, 10, 110);
            ruins.fillStyle(0x98b3e4, .7);
            ruins.fillTriangle(x + 70, y - 90, x + 58, y - 65, x + 82, y - 65);
            if (!w.opened.includes(l.id)) {
                g.fillStyle(0xc69f68);
                g.fillRoundedRect(x - 13, y - 20, 26, 20, 3);
                g.fillStyle(0xd2f9dc);
                g.fillRect(x - 3, y - 13, 6, 8);
            }
            else {
                g.lineStyle(2, 0x6f7477);
                g.strokeRect(x - 13, y - 10, 26, 10);
            }
        }
        this.active.set(key, { graphic: g, back: ruins, bodies });
    }
    destroy() { for (const key of [...this.active.keys()])
        this.unload(key); this.terrain.destroy(true); this.cache.clear(); this.pending = []; }
}
