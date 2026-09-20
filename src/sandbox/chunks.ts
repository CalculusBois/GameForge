import Phaser from 'phaser';
import { CHUNK, TILE, DEPTH, MATERIALS, type WorldSave } from './model';
import { generateChunk, hash, readTile, surface, harvestables, landmarks, biome, rustWeight, localOf, solid } from './terrain';
import { bossSites } from './bossSites';
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
        const viewOk = view.width > 32 && view.height > 32;
        for (const [key, chunk] of this.active) {
            const [x, y] = key.split(',').map(Number);
            const visible = !viewOk || (x * size < view.right + margin && (x + 1) * size > view.left - margin && y * size < view.bottom + margin && (y + 1) * size > view.top - margin);
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
                const wall=w.backgroundWalls?.[`${x},${y}`];
                if(wall) { ruins.fillStyle(wall===18?0x4e342e:0x36434d);ruins.fillRect(px,py,TILE,TILE);ruins.lineStyle(1,0x172630,.6);ruins.strokeRect(px,py,TILE,TILE); }
                if(mat>=32 && mat<=39) {
                    g.fillStyle(MATERIALS[mat].color);
                    if(mat===38) {g.fillRect(px+4,py+1,2,23);g.fillTriangle(px+6,py+2,px+22,py+7,px+6,py+15);}
                    else if(mat===39) {g.fillRect(px+10,py+10,4,14);g.fillCircle(px+12,py+7,7);}
                    else if(mat===37) {g.fillRect(px+4,py+2,4,22);g.fillRect(px+4,py+13,17,4);g.fillRect(px+17,py+16,4,8);}
                    else if(mat===34) {
                        // Cooking station workbench / campfire spit
                        g.fillStyle(0x5c4033); g.fillRect(px+2,py+14,20,10);
                        g.fillStyle(0x3e2723); g.fillRect(px+4,py+6,3,10); g.fillRect(px+17,py+6,3,10);
                        g.fillStyle(0xd7ccc8); g.fillRect(px+4,py+5,16,3);
                        g.fillStyle(0xff8a50); g.fillCircle(px+12,py+18,4);
                        g.fillStyle(0xffd180); g.fillCircle(px+12,py+17,2);
                    }
                    else {g.fillRect(px+2,py+8,20,5);g.fillRect(px+3,py+13,4,11);g.fillRect(px+17,py+13,4,11);if(mat===33){g.fillStyle(0xefa65c);g.fillCircle(px+12,py+17,5);}}
                    continue;
                }
                if (mat === 0 || mat === 8 || mat === 17 || mat === 18 || mat === 19 || mat === 20 || mat === 21 || mat === 22 || mat === 23 || mat === 24 || mat === 25 || mat === 26 || mat === 27 || mat === 28 || mat === 29 || mat === 30 || mat === 31) {
                    if (y > surface(w.settings, x) + 3 || mat === 18 || mat === 19) {
                        if (mat === 24 || mat === 25) {
                            // Doors stay visually open air — never paint a cave wall behind them.
                        } else if (mat === 18) {
                            ruins.fillStyle(0x4e342e);
                            ruins.fillRect(px, py, TILE, TILE);
                            ruins.fillStyle(0x3e2723, .5);
                            ruins.fillRect(px + 10, py, 3, TILE);
                        } else if (mat === 19) {
                            ruins.fillStyle(0x36434d);
                            ruins.fillRect(px, py, TILE, TILE);
                            ruins.fillStyle(0x232b31, .6);
                            ruins.fillRect(px, py + 11, TILE, 2);
                        } else {
                            const b = biome(w.settings, x, y);
                            const wallColor = b === 'Crystal depths' ? 0x211c33 : b === 'Ashen depths' ? 0x1a0d0d : b === 'Fungal hollows' ? 0x281f33 : b === 'Frost highlands' ? 0x36434d : b === 'Rust wastes' ? 0x3d2e24 : 0x202d35;
                            ruins.fillStyle(wallColor);
                            ruins.fillRect(px, py, TILE, TILE);
                            ruins.fillStyle(0x34404a, .3);
                            ruins.fillRect(px + 3, py + 3, 18, 1);
                        }
                    }
                    if (mat === 8) {
                        g.fillStyle(0x94714c);
                        g.fillRect(px + 10, py + 8, 4, 14);
                        g.fillStyle(0xffd18a);
                        g.fillCircle(px + 12, py + 7, 5);
                    } else if (mat === 17) {
                        g.fillStyle(0x8b5a2b);
                        g.fillRect(px, py, TILE, 5);
                        g.fillStyle(0x5c3d1e);
                        g.fillRect(px + 4, py + 5, 3, 6);
                        g.fillRect(px + 17, py + 5, 3, 6);
                    } else if (mat === 20) {
                        g.fillStyle(0xb5651d);
                        g.fillRect(px + 2, py + 4, 20, 18);
                        g.fillStyle(0x5c3d1e);
                        g.fillRect(px + 2, py + 4, 20, 2);
                        g.fillRect(px + 2, py + 20, 20, 2);
                        g.fillStyle(0xf1c40f);
                        g.fillRect(px + 10, py + 10, 4, 4);
                    } else if (mat === 21) {
                        g.fillStyle(0x8d6e63);
                        g.fillRect(px + 10, py, 4, TILE);
                        g.fillStyle(0x5d4037);
                        g.fillRect(px + 9, py + 6, 6, 2);
                        g.fillRect(px + 9, py + 18, 6, 2);
                    } else if (mat === 22) {
                        g.fillStyle(0xa1887f);
                        g.fillRect(px + 3, py, 4, TILE);
                        g.fillRect(px + 17, py, 4, TILE);
                        g.fillStyle(0x8d6e63);
                        g.fillRect(px + 7, py + 6, 10, 3);
                        g.fillRect(px + 7, py + 18, 10, 3);
                    } else if (mat === 23) {
                        g.fillStyle(0xbf2c00);
                        g.fillRect(px, py, TILE, TILE);
                        g.fillStyle(0xff5722);
                        g.fillRect(px + 2, py + 3, TILE - 4, 6);
                        g.fillRect(px + 4, py + 13, TILE - 8, 6);
                        g.fillStyle(0xffea00);
                        g.fillRect(px + 6, py + 5, 8, 3);
                        g.fillRect(px + 8, py + 15, 6, 2);
                        g.fillStyle(0x3e0000, .7);
                        g.fillRect(px + 3, py + 2, 5, 3);
                        g.fillRect(px + 15, py + 10, 4, 3);
                    } else if (mat === 24) {
                        g.fillStyle(0x3e2723);
                        g.fillRect(px + 4, py, TILE - 8, TILE);
                        g.fillStyle(0x8d6e4a);
                        g.fillRect(px + 5, py + 1, TILE - 10, TILE - 2);
                        g.fillStyle(0x5d4037);
                        g.fillRect(px + 5, py + 8, TILE - 10, 2);
                        g.fillStyle(0xffd54f);
                        g.fillRect(px + TILE - 10, py + 12, 3, 3);
                    } else if (mat === 25) {
                        g.fillStyle(0x3e2723);
                        g.fillRect(px, py, 6, TILE);
                        g.fillStyle(0x8d6e4a);
                        g.fillRect(px + 1, py + 1, 4, TILE - 2);
                        g.fillStyle(0xffd54f);
                        g.fillRect(px + 2, py + 12, 2, 2);
                    } else if (mat >= 26 && mat <= 29) {
                        // Totem carved stone obelisk
                        g.fillStyle(0x37474f);
                        g.fillRect(px + 3, py + 16, 18, 8);
                        g.fillStyle(0x455a64);
                        g.fillRect(px + 5, py + 4, 14, 12);
                        g.fillStyle(0x263238);
                        g.fillRect(px + 7, py + 2, 10, 3);
                        // Glowing rune gemstone
                        const gemColor = mat === 26 ? 0x2ecc71 : mat === 27 ? 0x3498db : mat === 28 ? 0xf39c12 : 0x9b59b6;
                        g.fillStyle(gemColor);
                        g.fillRect(px + 8, py + 7, 8, 8);
                        g.fillStyle(0xffffff, .85);
                        g.fillRect(px + 10, py + 9, 4, 4);
                    } else if (mat === 30) {
                        // Crop seedling: small green dual leaves
                        g.fillStyle(0x388e3c);
                        g.fillRect(px + 11, py + 16, 2, 8);
                        g.fillStyle(0x4caf50);
                        g.fillTriangle(px + 12, py + 16, px + 6, py + 12, px + 12, py + 14);
                        g.fillTriangle(px + 12, py + 16, px + 18, py + 12, px + 12, py + 14);
                    } else if (mat === 31) {
                        // Mature crop: lush bushy vegetation with golden-orange produce tubers
                        g.fillStyle(0x2e7d32);
                        g.fillRect(px + 11, py + 10, 2, 14);
                        g.fillStyle(0x43a047);
                        g.fillCircle(px + 12, py + 10, 7);
                        g.fillStyle(0x66bb6a);
                        g.fillCircle(px + 8, py + 12, 5);
                        g.fillCircle(px + 16, py + 12, 5);
                        g.fillStyle(0xffa726);
                        g.fillCircle(px + 12, py + 16, 4);
                        g.fillCircle(px + 7, py + 18, 3);
                        g.fillCircle(px + 17, py + 18, 3);
                        g.fillStyle(0xffe082);
                        g.fillRect(px + 11, py + 15, 2, 2);
                    }
                    continue;
                }
                const tint = hash(w.settings.seed, x, y, 'tile') > .5 ? 8 : 0;
                let color=MATERIALS[mat].color + tint * 0x010101;
                const curBiome = biome(w.settings, x, y);
                if(mat===1||mat===9){
                    if(curBiome==='Frost highlands'){
                        const from=Phaser.Display.Color.IntegerToColor(color);
                        const target=Phaser.Display.Color.IntegerToColor(0x8a9ea8);
                        const mixed=Phaser.Display.Color.Interpolate.ColorWithColor(from,target,100,60);
                        color=Phaser.Display.Color.GetColor(mixed.r,mixed.g,mixed.b);
                    } else {
                        const blend=rustWeight(w.settings,x),to=mat===9?0x987f61:0x856047;
                        const from=Phaser.Display.Color.IntegerToColor(color),target=Phaser.Display.Color.IntegerToColor(to);
                        const mixed=Phaser.Display.Color.Interpolate.ColorWithColor(from,target,100,blend*100);
                        color=Phaser.Display.Color.GetColor(mixed.r,mixed.g,mixed.b);
                    }
                }
                g.fillStyle(color);
                g.fillRect(px, py, TILE, TILE);
                g.fillStyle(0x122330, .25);
                g.fillRect(px + 4, py + 14, 10, 2);
                g.fillRect(px + 17, py + 4, 4, 3);
                // Grass / biome toppers only on the true surface — never on cave floors/ceilings
                const surfY = surface(w.settings, x);
                const isSurfaceTop = y <= surfY + 1 && y >= surfY - 1;
                if (!MATERIALS[readTile(w, x, y - 1)].solid) {
                    if (isSurfaceTop && (mat === 1 || mat === 9 || mat === 2)) {
                        if (curBiome === 'Frost highlands') {
                            g.fillStyle(0xeef6f8);
                            g.fillRect(px, py, TILE, 4);
                            g.fillStyle(0xbddae6);
                            g.fillRect(px + 2, py + 3, TILE - 4, 2);
                        } else if (curBiome === 'Rust wastes') {
                            g.fillStyle(0xba6934);
                            g.fillRect(px, py, TILE, 3);
                            g.fillStyle(0x7c4728);
                            g.fillRect(px + 4, py + 2, 8, 2);
                        } else if (curBiome === 'Fungal hollows') {
                            g.fillStyle(0x9b5de5);
                            g.fillRect(px, py, TILE, 3);
                            g.fillStyle(0x00f5d4);
                            g.fillRect(px + 4, py + 1, 3, 2);
                            g.fillRect(px + 16, py + 1, 3, 2);
                        } else if (curBiome === 'Ashen depths') {
                            g.fillStyle(0x221820);
                            g.fillRect(px, py, TILE, 3);
                            g.fillStyle(0xff5722);
                            g.fillRect(px + 5, py + 2, 4, 1);
                            g.fillRect(px + 15, py + 2, 4, 1);
                        } else if (curBiome === 'Crystal depths') {
                            g.fillStyle(0xad9dff);
                            g.fillRect(px, py, TILE, 3);
                            g.fillStyle(0xffffff, .7);
                            g.fillRect(px + 7, py, 4, 2);
                        } else {
                            g.fillStyle(mat === 9 ? 0x88b878 : 0x76a066);
                            g.fillRect(px, py, TILE, 4);
                            g.fillStyle(0x5e8c52);
                            g.fillRect(px + 3, py + 3, 2, 3);
                            g.fillRect(px + 12, py + 3, 3, 2);
                            g.fillRect(px + 20, py + 3, 2, 3);
                        }
                    } else if (!isSurfaceTop) {
                        // Cave/open faces: subtle rock lip, not grass
                        g.fillStyle(0x1a2834, 0.55);
                        g.fillRect(px, py, TILE, 2);
                        g.fillStyle(0x5a6e7a, 0.25);
                        g.fillRect(px + 3, py, 4, 2);
                        g.fillRect(px + 14, py, 5, 2);
                    }
                }
                if (!MATERIALS[readTile(w, x - 1, y)].solid) {
                    g.fillStyle(0xadc0c6, .25);
                    g.fillRect(px, py, 2, TILE);
                }
                if (!MATERIALS[readTile(w, x + 1, y)].solid) {
                    g.fillStyle(0x000000, .15);
                    g.fillRect(px + TILE - 2, py, 2, TILE);
                }
                if (!MATERIALS[readTile(w, x, y + 1)].solid) {
                    g.fillStyle(0x000000, .25);
                    g.fillRect(px, py + TILE - 2, TILE, 2);
                }
                const flecks: Record<number, { base: number; color: number; accent: number }> = {
                    3: { base: 0x4a382e, color: 0xf0d0b0, accent: 0xffefd8 },   // iron
                    4: { base: 0x2a2048, color: 0xe0c8ff, accent: 0xffffff },   // crystal
                    5: { base: 0x3a3028, color: 0xe8d0a8, accent: 0xa89070 },   // scrap
                    10: { base: 0x5a2818, color: 0xffa070, accent: 0xffe0b8 },  // copper
                    11: { base: 0x101010, color: 0x8a8a8a, accent: 0xd0d0d0 },  // coal — light flecks on black
                    12: { base: 0x3a4550, color: 0xf5f8fb, accent: 0xffffff },  // silver
                    13: { base: 0x5a4010, color: 0xffe08a, accent: 0xfff8d0 },  // gold
                    14: { base: 0x102848, color: 0x60d8ff, accent: 0xb8f0ff },  // cobalt
                    15: { base: 0x120818, color: 0xd040c0, accent: 0xff60b0 },  // obsidian
                    16: { base: 0x281860, color: 0x90e8ff, accent: 0xffffff },  // aether
                };
                if (flecks[mat] !== undefined) {
                    const vein = flecks[mat]!;
                    // Recolor tile body so veins contrast in caves
                    g.fillStyle(vein.base, 1);
                    g.fillRect(px, py, TILE, TILE);
                    g.fillStyle(vein.color, 1);
                    g.fillRect(px + 2, py + 3, 9, 8);
                    g.fillRect(px + 12, py + 11, 9, 9);
                    g.fillRect(px + 7, py + 8, 6, 5);
                    g.fillStyle(vein.accent, 1);
                    g.fillRect(px + 4, py + 4, 3, 3);
                    g.fillRect(px + 14, py + 13, 4, 3);
                    g.fillRect(px + 9, py + 9, 2, 2);
                    g.fillRect(px + 18, py + 5, 3, 3);
                }
            }
            for (let lx = 0; lx < CHUNK;) {
                if (!MATERIALS[tiles[ly * CHUNK + lx]].solid || tiles[ly * CHUNK + lx] === 24) {
                    lx++;
                    continue;
                }
                const start = lx;
                while (lx < CHUNK && MATERIALS[tiles[ly * CHUNK + lx]].solid && tiles[ly * CHUNK + lx] !== 24)
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
        for (let ly = 0; ly < CHUNK; ly++) {
            for (let lx = 0; lx < CHUNK; lx++) {
                if (tiles[ly * CHUNK + lx] !== 24) continue;
                const px = (cx * CHUNK + lx) * TILE + 5;
                const py = (cy * CHUNK + ly) * TILE + TILE / 2;
                const door = this.scene.add.rectangle(px, py, 8, TILE, 0xffffff, 0);
                this.scene.physics.add.existing(door, true);
                this.terrain.add(door);
                bodies.push(door);
            }
        }
        for (const p of harvestables(w.settings, cx)) {
            if (Math.floor((p.y - 1) / CHUNK) !== cy || w.harvested.includes(p.id))
                continue;
            // Tree / plant needs solid ground under it — otherwise it is gone
            if (!solid(w, p.x, p.y))
                continue;
            const x = p.x * TILE, y = p.y * TILE;
            if (p.kind === 'tree') {
                const b = biome(w.settings, p.x, p.y);
                if (b === 'Frost highlands') {
                    g.fillStyle(0x5a4638);
                    g.fillRect(x + 9, y - 80, 6, 80);
                    g.fillStyle(0x2d5a45);
                    g.fillTriangle(x + 12, y - 95, x - 18, y - 55, x + 42, y - 55);
                    g.fillTriangle(x + 12, y - 75, x - 22, y - 30, x + 46, y - 30);
                    g.fillStyle(0xeef6f8, .9);
                    g.fillTriangle(x + 12, y - 95, x + 2, y - 75, x + 22, y - 75);
                    g.fillRect(x - 12, y - 56, 14, 3);
                    g.fillRect(x + 16, y - 56, 14, 3);
                } else {
                    g.fillStyle(0x755c4d);
                    g.fillRect(x + 8, y - 80, 9, 80);
                    g.fillStyle(0x4c7965);
                    g.fillEllipse(x + 12, y - 85, 70, 48);
                    g.fillStyle(0x7f9c70);
                    g.fillEllipse(x + 1, y - 100, 48, 35);
                }
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
            const surfaceChest = l.id.startsWith('surface-chest');
            if (!surfaceChest) {
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
            }
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
        for (const site of bossSites(w.settings)) {
            if (Math.floor(site.x / CHUNK) !== cx || Math.floor(site.floor / CHUNK) !== cy) continue;
            const x = site.x * TILE, y = site.floor * TILE;
            const tall = w.settings.difficulty === 'boss';
            const h = tall ? 132 : 88;
            ruins.fillStyle(0x3a2a4a, 0.72);
            ruins.fillRect(x - 36, y - h, 72, h);
            ruins.lineStyle(3, 0xc6adf4, 0.85);
            ruins.strokeRect(x - 36, y - h, 72, h);
            g.fillStyle(0x5d3d6e);
            g.fillRect(x - 10, y - h - 8, 20, h + 8);
            g.fillStyle(0xe08db4);
            g.fillTriangle(x, y - h - 36, x - 22, y - h + 4, x + 22, y - h + 4);
            g.fillStyle(0xf8e6ff);
            g.fillCircle(x, y - h - 40, tall ? 10 : 7);
            g.fillStyle(0xffe08a);
            g.fillRect(x - 4, y - 18, 8, 18);
        }
        this.active.set(key, { graphic: g, back: ruins, bodies });
    }
    destroy() { for (const key of [...this.active.keys()])
        this.unload(key); this.terrain.destroy(true); this.cache.clear(); this.pending = []; }
}
