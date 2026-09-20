import Phaser from 'phaser';
import { MOVEMENT } from '../platformer/config';
import { sandboxAssets } from './assets';
import { ChunkManager } from './chunks';
import { SaveStore } from './persistence';
import { ENEMIES, type Kind } from './enemies';
import { TILE, CHUNK, DEPTH, WORLD_LIMIT, ITEMS, MATERIALS, BUILDING, WEAPONS, add, remove, chest, type Biome, type ItemId } from './model';
import { readTile, editTile, clearLine, solid, biome, surface, hash, harvestables, landmarks, protectedTile } from './terrain';
import { sessionStart_ as analyticsStart, track as analyticsTrack } from '../analytics';
export type Menu = 'inventory' | 'crafting' | 'skins' | 'objectives' | 'shop' | 'map' | 'worlds' | 'settings' | 'stats' | null;
export interface SandboxHud {
    health: number;
    mana: number;
    status: 'playing' | 'paused' | 'loading' | 'dead';
    biome: Biome;
    selected: number;
    message: string;
    nearBase: boolean;
    fps: number;
    chunks: number;
    enemies: number;
    bodies: number;
    x: number;
    y: number;
    recall: number;
}
export interface SandboxController {
    resume: () => void;
    pause: () => void;
    select: (n: number) => void;
    recall: () => void;
    respawn: () => void;
    save: () => Promise<void>;
    destroy: () => void;
    setShake: (b: boolean) => void;
}
export interface VerificationPort {
    read:()=>{x:number;y:number;vx:number;vy:number;grounded:boolean;blockedLeft:boolean;blockedRight:boolean;health:number;mana:number;status:string;clock:number;chunks:number;bodies:number;fps:number;busy:boolean;message:string;recall:number;enemies:{id:string;kind:Kind;x:number;y:number;hp:number;state:string}[]};
    hold:(keys:string[])=>void; aim:(x:number,y:number)=>void; select:(slot:number)=>void;resume:()=>void;pause:()=>void;recall:()=>void;respawn:()=>void;save:()=>Promise<void>;
    encounter:(kind:Kind,x:number,y:number,id:string)=>void;
}
export function startSandbox(host: HTMLElement, store: SaveStore, onHud: (h: SandboxHud) => void, onMenu: (m: Menu) => void, verification?: (port:VerificationPort)=>void): SandboxController {
    let scene: WorldScene | undefined, disposed = false;
    class WorldScene extends Phaser.Scene {
        player!: Phaser.Physics.Arcade.Sprite;
        weapon!: Phaser.GameObjects.Image;
        chunks!: ChunkManager;
        foes!: Phaser.Physics.Arcade.Group;
        shots!: Phaser.Physics.Arcade.Group;
        hostile!: Phaser.Physics.Arcade.Group;
        target!: Phaser.GameObjects.Graphics;
        light!: Phaser.GameObjects.Graphics;
        sky!: Phaser.GameObjects.Graphics;
        stars!: Phaser.GameObjects.Graphics;
        particles = new Set<Phaser.GameObjects.Rectangle>();
        status: SandboxHud['status'] = 'paused';
        health = 100;
        mana = 100;
        selected = store.world.selected;
        clock = 0;
        facing = 1;
        lastGround = -1000;
        buffer = -1000;
        jumped = false;
        lastAttack = -1000;
        lastMagic = -10000;
        hurtUntil = 0;
        knockUntil = 0;
        lastHud = 0;
        lastAi = 0;
        lastSpawn = 0;
        lastExplore = '';
        recallStart = 0;
        shake = true;
        held = new Set<string>();
        fresh = new Set<string>();
        cursor = { x: 0, y: 0, known: false };
        mining = { key: '', progress: 0 };
        busy = false;
        message = 'Gather timber with E · Mine the nearby iron · Visit your workbench';
        noticeUntil = 0;
        safe = { x: 0, y: 0 };
        decorDirty = false;
        constructor() { super('Sandbox'); scene = this; }
        create() {
            analyticsStart(store.world.id, store.world.settings.difficulty);
            sandboxAssets(this);
            this.sky = this.add.graphics().setScrollFactor(0).setDepth(-10);
            this.stars = this.add.graphics().setScrollFactor(0).setDepth(-9);
            this.chunks = new ChunkManager(this, () => store.world);
            const w = store.world;
            let p = w.player;
            if (solid(w, Math.floor(p.x / TILE), Math.floor(p.y / TILE)) || p.y >= (DEPTH - 3) * TILE)
                p = w.checkpoint;
            this.player = this.physics.add.sprite(p.x, p.y, `${store.data.profile.equipped}-idle`).setDepth(10);
            this.player.setSize(22, 42).setOffset(9, 4).setMaxVelocity(MOVEMENT.speed, MOVEMENT.maxFall);
            this.safe = { x: p.x, y: p.y };
            this.weapon = this.add.image(p.x + 20, p.y, 'gun-tool').setOrigin(.15, .5).setDepth(11);
            this.foes = this.physics.add.group();
            this.shots = this.physics.add.group({ allowGravity: false });
            this.hostile = this.physics.add.group({ allowGravity: false });
            this.physics.add.collider(this.player, this.chunks.terrain);
            this.physics.add.collider(this.foes, this.chunks.terrain);
            this.physics.add.collider(this.shots, this.chunks.terrain, s => { this.burst((s as Phaser.Physics.Arcade.Sprite).x, (s as Phaser.Physics.Arcade.Sprite).y, 0x82eeef); s.destroy(); });
            this.physics.add.collider(this.hostile, this.chunks.terrain, s => s.destroy());
            this.physics.add.overlap(this.shots, this.foes, (s, f) => { const shot = s as Phaser.Physics.Arcade.Sprite, foe = f as Phaser.Physics.Arcade.Sprite; if (!shot.active || !foe.active || foe.getData('dying'))
                return; this.hit(foe, shot.getData('damage')); shot.destroy(); });
            this.physics.add.overlap(this.player, this.foes, (_p, f) => { const foe = f as Phaser.Physics.Arcade.Sprite; if (!foe.getData('dying'))
                this.damage(ENEMIES[foe.getData('kind') as Kind].damage, foe.x); });
            this.physics.add.overlap(this.player, this.hostile, (_p, s) => { const shot = s as Phaser.Physics.Arcade.Sprite; this.damage(shot.getData('damage'), shot.x); shot.destroy(); });
            this.target = this.add.graphics().setDepth(12);
            this.light = this.add.graphics().setDepth(20).setScrollFactor(0);
            this.drawBase();
            this.cameras.main.startFollow(this.player, true, .13, .13, 0, 30);
            this.cameras.main.setDeadzone(110, 60);
            this.cameras.main.setBounds(-WORLD_LIMIT * TILE, 0, WORLD_LIMIT * TILE * 2, DEPTH * TILE);
            this.chunks.ensure(p.x, p.y);
            this.physics.pause();
            this.emit();
            if(import.meta.env.DEV&&verification)verification({
                read:()=>{const body=this.player.body as Phaser.Physics.Arcade.Body;return {x:this.player.x,y:this.player.y,vx:body.velocity.x,vy:body.velocity.y,grounded:body.blocked.down||body.touching.down,blockedLeft:body.blocked.left,blockedRight:body.blocked.right,health:this.health,mana:this.mana,status:this.status,clock:this.clock,chunks:this.chunks.active.size,bodies:this.chunks.bodyCount,fps:this.game.loop.actualFps,busy:this.busy,message:this.message,recall:this.recallStart,enemies:this.foes.getChildren().map(obj=>{const f=obj as Phaser.Physics.Arcade.Sprite;return {id:f.getData('id'),kind:f.getData('kind'),x:f.x,y:f.y,hp:f.getData('hp'),state:f.getData('state')};})};},
                hold:keys=>{const next=new Set(keys);for(const key of next)if(!this.held.has(key))this.fresh.add(key);this.held=next;},
                aim:(x,y)=>{this.cursor={x,y,known:true};},select:n=>{this.selected=n;},resume:()=>this.resume(),pause:()=>this.pause(),recall:()=>this.recall(),respawn:()=>this.respawn(),save:()=>this.save(),
                encounter:(kind,x,y,id)=>{if(this.foes.countActive()<12)this.createEnemy(kind,x,y,id);}
            });
        }
        drawBase() { const y = 22 * TILE, g = this.add.graphics().setDepth(2); g.fillStyle(0x1b3645); g.fillRect(6 * TILE, y - 104, 19 * TILE, 104); g.lineStyle(3, 0x83bcbb); g.strokeRect(6 * TILE, y - 104, 19 * TILE, 104); g.fillStyle(0x35515a); g.fillRect(6 * TILE, y - 104, 19 * TILE, 10); g.fillStyle(0x85eace); g.fillRect(8 * TILE, y - 65, 7, 60); for (const [x, name, color] of [[14, 'WORKBENCH', 0xcca176], [18, 'FORGE', 0xf0ae6d], [22, 'TERMINAL', 0x8dd8f3]] as const) {
            g.fillStyle(color);
            g.fillRect(x * TILE - 18, y - 30, 36, 30);
            this.add.text(x * TILE, y - 52, name, { fontFamily: 'monospace', fontSize: '9px', color: '#bce4dd' }).setOrigin(.5).setDepth(3);
        } this.add.text(8 * TILE, y - 86, 'LUMEN OUTPOST', { fontFamily: 'monospace', fontSize: '12px', color: '#94f3ce' }).setDepth(3); }
        nearBase() { return Math.abs(this.player.x - 15 * TILE) < 270 && Math.abs(this.player.y - 22 * TILE) < 120; }
        emit() { if (disposed || !this.player)
            return; onHud({ health: this.health, mana: Math.floor(this.mana), status: this.status, biome: biome(store.world.settings, Math.floor(this.player.x / TILE), Math.floor(this.player.y / TILE)), selected: this.selected, message: this.message, nearBase: this.nearBase(), fps: Math.round(this.game.loop.actualFps), chunks: this.chunks.active.size, enemies: this.foes.countActive(), bodies: this.chunks.bodyCount, x: this.player.x, y: this.player.y, recall: this.recallStart ? Math.min(1, (this.clock - this.recallStart) / 2500) : 0 }); }
        notify(m: string) { this.message = m; this.noticeUntil = this.clock + 4500; this.emit(); }
        async transact(action: Parameters<SaveStore['transact']>[0]) { try {
            const result = await store.transact(action);
            if (typeof result === 'string')
                this.notify(result);
            return true;
        }
        catch (e) {
            this.notify(e instanceof Error ? e.message : String(e));
            return false;
        } }
        burst(x: number, y: number, color: number) { for (let i = 0; i < 5 && this.particles.size < 80; i++) {
            const p = this.add.rectangle(x, y, 3, 3, color).setDepth(14);
            this.particles.add(p);
            this.tweens.add({ targets: p, x: x + (i - 2) * 10, y: y - 10 - Math.random() * 20, alpha: 0, duration: 300, onComplete: () => { this.particles.delete(p); p.destroy(); } });
        } }
        pause() { if (this.status === 'dead')
            return; this.status = 'paused'; this.physics.pause(); this.held.clear(); this.fresh.clear(); this.tweens.pauseAll(); this.recallStart = 0; this.emit(); void this.save().catch(() => { }); }
        resume() { if (this.status === 'dead')
            return; this.status = 'playing'; this.held.clear(); this.fresh.clear(); this.tweens.resumeAll(); this.emit(); }
        async save() { if (this.player)
            await store.savePosition(this.player.x, this.player.y, this.selected); }
        recall() { if (this.status !== 'playing')
            return; this.recallStart = this.clock || 1; this.notify('Recalling to the outpost… remain still for 2.5 seconds. Damage cancels recall.'); }
        respawn() {
            this.held.clear(); this.fresh.clear(); this.buffer = -1000; this.lastGround = -1000;
            this.jumped = false; this.knockUntil = 0; this.lastAttack = -1000; this.lastMagic = -1000;
            this.mining = {key: '', progress: 0}; this.cursor.known = false;
            this.health = 100; this.mana = 100; this.hurtUntil = this.clock + 2000; this.recallStart = 0; this.shots.clear(true, true); this.hostile.clear(true, true); this.foes.clear(true, true); this.player.setVelocity(0).setAcceleration(0); this.player.setPosition(store.world.checkpoint.x, store.world.checkpoint.y); this.safe = { ...store.world.checkpoint }; this.status = 'playing'; this.tweens.resumeAll(); this.chunks.ensure(this.player.x, this.player.y); this.notify('Returned to the outpost. Inventory, coins, and skins retained.'); }
        damage(n: number, x: number) { if (this.status !== 'playing' || this.clock < this.hurtUntil || this.nearBase())
            return; this.health = Math.max(0, this.health - Math.ceil(n * (store.world.settings.difficulty === 'explorer' ? .7 : 1))); this.hurtUntil = this.clock + 1000; this.knockUntil = this.clock + 180; this.player.setAccelerationX(0).setVelocity(this.player.x < x ? -170 : 170, -170); if (this.recallStart) {
            this.recallStart = 0;
            this.notify('Recall interrupted by damage.');
        } this.burst(this.player.x, this.player.y, 0xff9b98); if (this.shake)
            this.cameras.main.shake(100, .003); if (!this.health) {
            this.status = 'dead';
            analyticsTrack('player_death', biome(store.world.settings, Math.floor(this.player.x / TILE), Math.floor(this.player.y / TILE)), String(Math.floor(this.player.x / TILE)), String(Math.floor(this.player.y / TILE)));
            this.held.clear();
            this.physics.pause();
            this.notify('Signal lost. Respawn at the beacon; all possessions are retained.');
        } this.emit(); }
        hit(f: Phaser.Physics.Arcade.Sprite, damage: number) { if (f.getData('dying'))
            return; const kind = f.getData('kind') as Kind; const vulnerable = kind === 'caster' && f.getData('state') === 'recover'; const hp = f.getData('hp') - damage * (vulnerable ? 1.5 : 1); f.setData('hp', hp); f.setTintFill(0xffffff); this.time.delayedCall(90, () => { if (f.active)
            f.clearTint(); }); this.burst(f.x, f.y, 0xffb889); if (hp <= 0) {
            analyticsTrack('enemy_defeated', kind, store.world.inventory[this.selected]?.id ?? 'unknown', String(this.health));
            f.setData('dying', true);
            f.setVelocity(0);
            const id = f.getData('id') as string;
            void this.transact((_b, w) => { if (w.defeated.includes(id))
                return ''; w.defeated.push(id); w.progress.kills++; w.coins += ENEMIES[kind].reward; const resource: ItemId = kind === 'caster' ? 'crystal' : kind === 'hopper' ? 'herb' : 'scrap'; const stored = add(w.inventory, resource, 1); if (!stored) {
                w.pendingLoot ??= {};
                w.pendingLoot[resource] = (w.pendingLoot[resource] ?? 0) + 1;
            } return `+${ENEMIES[kind].reward} coins${stored ? ` · ${ITEMS[resource].name}` : ' · Pack full: resource held at the outpost'}`; }).then(ok => { if (!f.active)
                return; if (ok)
                f.destroy();
            else {
                f.setData('dying', false);
                f.setData('hp', 1);
            } });
        }
        else {
            f.setVelocityX(f.x < this.player.x ? -100 : 100);
            f.setData('stun', this.clock + 140);
        } }
        attack() {
            const item = store.world.inventory[this.selected]?.id;
            if (!item)
                return;
            if (item === 'tonic') {
                if (this.health >= 100) {
                    this.notify('Health is already full.');
                    return;
                }
                if (!this.busy) {
                    this.busy = true;
                    void this.transact((_b, w) => { if (!remove(w.inventory, 'tonic', 1))
                        throw new Error('No field tonic.'); return 'Restored 40 health'; }).then(ok => { if (disposed)
                        return; if (ok)
                        this.health = Math.min(100, this.health + 40); this.busy = false; });
                }
                return;
            }
            if (!(item in WEAPONS))
                return;
            const stats = WEAPONS[item as keyof typeof WEAPONS];
            if (this.clock - this.lastAttack < stats.cooldown)
                return;
            if (this.mana < stats.mana) {
                this.lastAttack = this.clock;
                this.notify('Low mana. Let your energy recharge.');
                return;
            }
            if (this.shots.countActive() >= 30)
                return;
            this.lastAttack = this.clock;
            this.mana -= stats.mana;
            if (stats.mana)
                this.lastMagic = this.clock;
            if (item === 'sword') {
                const arc = this.add.graphics().setDepth(12);
                arc.lineStyle(5, 0xb4fff0, .9);
                arc.beginPath();
                arc.arc(this.player.x, this.player.y, 62, this.facing === 1 ? -1.1 : 2, this.facing === 1 ? 1.1 : 4.3);
                arc.strokePath();
                this.tweens.add({ targets: arc, alpha: 0, duration: 170, onComplete: () => arc.destroy() });
                for (const obj of this.foes.getChildren()) {
                    const f = obj as Phaser.Physics.Arcade.Sprite;
                    if (Math.abs(f.x - this.player.x) < 80 && Math.abs(f.y - this.player.y) < 60 && (f.x - this.player.x) * this.facing >= -12 && clearLine(store.world, this.player.x, this.player.y, f.x, f.y))
                        this.hit(f, stats.damage);
                }
                return;
            }
            const aim = this.cursor.known ? new Phaser.Math.Vector2(this.cursor.x - this.player.x, this.cursor.y - this.player.y).normalize() : new Phaser.Math.Vector2(this.facing, 0);
            const x = this.player.x + aim.x * 26, y = this.player.y + aim.y * 26;
            if (!clearLine(store.world, this.player.x, this.player.y, x, y))
                return;
            const shot = this.shots.create(x, y, item === 'staff' ? 'magic' : 'shot') as Phaser.Physics.Arcade.Sprite;
            shot.setVelocity(aim.x * stats.speed, aim.y * stats.speed).setRotation(aim.angle());
            shot.setData({ damage: stats.damage, expires: this.clock + 1500 });
            this.burst(x, y, item === 'staff' ? 0xc2a3ff : 0x9dffdf);
        }
        targetTile() { return { x: Math.floor((this.cursor.known ? this.cursor.x : this.player.x + this.facing * 32) / TILE), y: Math.floor((this.cursor.known ? this.cursor.y : this.player.y + 32) / TILE) }; }
        inReach(x: number, y: number) { return Math.hypot((x + .5) * TILE - this.player.x, (y + .5) * TILE - this.player.y) <= TILE * 5 && clearLine(store.world, this.player.x, this.player.y, (x + .5) * TILE, (y + .5) * TILE, true); }
        mine(delta: number) {
            const item = store.world.inventory[this.selected]?.id;
            if (!['pickaxe', 'drill'].includes(item ?? ''))
                return;
            const { x, y } = this.targetTile(), m = readTile(store.world, x, y), key = `${x},${y}`;
            if (!this.inReach(x, y) || !m || m === 6 || protectedTile(x, y)) {
                this.mining.progress = 0;
                return;
            }
            if (this.mining.key !== key)
                this.mining = { key, progress: 0 };
            this.mining.progress += delta * (item === 'drill' ? 2 : 1);
            this.target.fillStyle(0xf1e0b0, .8);
            this.target.fillRect(x * TILE, y * TILE - 5, TILE * Math.min(1, this.mining.progress / MATERIALS[m].time), 3);
            if (this.mining.progress >= MATERIALS[m].time && !this.busy) {
                this.busy = true;
                this.mining.progress = 0;
                void this.transact((_b, w) => { if (readTile(w, x, y) !== m)
                    return ''; const drop = MATERIALS[m].drop; if (drop && !add(w.inventory, drop, 1))
                    throw new Error('Inventory full. The block was not mined.'); editTile(w, x, y, 0); analyticsTrack('block_mined', MATERIALS[m].name, drop ?? '', biome(store.world.settings, x, Math.floor(this.player.y / TILE))); if (drop === 'stone')
                    w.progress.stone++; return `+1 ${drop ? ITEMS[drop].name : 'resource'}`; }).then(ok => { if (disposed)
                    return; if (ok) {
                    this.chunks.invalidate(x, y);
                    this.burst((x + .5) * TILE, (y + .5) * TILE, MATERIALS[m].color);
                } this.busy = false; });
            }
        }
        place() {
            const item = store.world.inventory[this.selected]?.id;
            if (!item || BUILDING[item] === undefined) {
                this.notify('Select soil, stone, outpost blocks, or torches to place.');
                return;
            }
            const material = BUILDING[item]!, { x, y } = this.targetTile();
            const rect = new Phaser.Geom.Rectangle(x * TILE, y * TILE, TILE, TILE);
            const occupied = Phaser.Geom.Intersects.RectangleToRectangle(rect, this.player.getBounds()) || this.foes.getChildren().some(f => Phaser.Geom.Intersects.RectangleToRectangle(rect, (f as Phaser.Physics.Arcade.Sprite).getBounds()));
            if (this.busy || !this.inReach(x, y) || readTile(store.world, x, y) !== 0 || occupied || protectedTile(x, y) || ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => solid(store.world, x + dx, y + dy))) {
                this.notify('Place beside an existing block, within reach, away from actors and the outpost.');
                return;
            }
            this.busy = true;
            void this.transact((_b, w) => { if (readTile(w, x, y) !== 0 || !remove(w.inventory, item, 1))
                throw new Error('Placement unavailable.'); editTile(w, x, y, material); return `Placed ${ITEMS[item].name}`; }).then(ok => { if (disposed)
                return; if (ok)
                this.chunks.invalidate(x, y); this.busy = false; });
        }
        interact() {
            const w = store.world, cx = Math.floor(this.player.x / (TILE * CHUNK));
            for (const dx of [-1, 0, 1]) {
                for (const l of landmarks(w.settings, cx + dx)) {
                    if (Math.hypot(l.x * TILE - this.player.x, l.y * TILE - this.player.y) < 80 && clearLine(w, this.player.x, this.player.y, l.x * TILE, l.y * TILE - 12)) {
                        if (!this.busy) {
                            this.busy = true;
                            void this.transact((_b, world) => chest(world, l.id)).then(ok => { if (disposed)
                                return; if (ok)
                                this.chunks.refreshDecor(l.x, l.y); this.busy = false; });
                        }
                        return;
                    }
                }
                for (const p of harvestables(w.settings, cx + dx)) {
                    if (!w.harvested.includes(p.id) && Math.hypot(p.x * TILE - this.player.x, p.y * TILE - 20 - this.player.y) < 75 && clearLine(w, this.player.x, this.player.y, p.x * TILE, p.y * TILE - 15)) {
                        if (this.busy)
                            return;
                        this.busy = true;
                        void this.transact((_b, world) => { if (world.harvested.includes(p.id))
                            return ''; const id: ItemId = p.kind === 'tree' ? 'wood' : p.kind === 'herb' ? 'herb' : 'scrap', quantity = p.kind === 'tree' ? 8 : 3; if (!add(world.inventory, id, quantity))
                            throw new Error('Inventory full. Gather this later.'); world.harvested.push(p.id); return `+${quantity} ${ITEMS[id].name}`; }).then(ok => { if (disposed)
                            return; if (ok)
                            this.chunks.refreshDecor(p.x, p.y - 1); this.busy = false; });
                        return;
                    }
                }
            }
            if (this.nearBase()) {
                this.pause();
                onMenu(Math.abs(this.player.x - 22 * TILE) < 55 ? 'shop' : 'crafting');
                return;
            }
            this.notify('Press E beside a tree, herb, salvage pile, chest, or outpost station.');
        }
        spawn() {
            if (this.foes.countActive() >= 12)
                return;
            const w = store.world, cam = this.cameras.main.worldView;
            for (const key of this.chunks.active.keys()) {
                const [cx, cy] = key.split(',').map(Number), id = `enemy:${key}`;
                if (w.defeated.includes(id) || this.foes.getChildren().some(f => (f as Phaser.Physics.Arcade.Sprite).getData('id') === id))
                    continue;
                const tx = cx * CHUNK + 6 + Math.floor(hash(w.settings.seed, cx, cy, 'enemy') * 20);
                let ty = surface(w.settings, tx) - 1;
                if (Math.floor(ty / CHUNK) !== cy) {
                    ty = cy * CHUNK + 2;
                    while (ty < (cy + 1) * CHUNK - 2 && (solid(w, tx, ty) || solid(w, tx, ty - 1) || !solid(w, tx, ty + 1)))
                        ty++;
                }
                if (Math.floor(ty / CHUNK) !== cy)
                    continue;
                for (let n = 0; n < 7 && !solid(w, tx, ty + 1); n++)
                    ty++;
                const x = (tx + .5) * TILE, y = (ty + 1) * TILE - 23;
                if (Math.abs(x - 12 * TILE) < 580 || Phaser.Geom.Rectangle.Contains(Phaser.Geom.Rectangle.Clone(cam).setSize(cam.width + 100, cam.height + 100), x, y) || Math.hypot(x - this.player.x, y - this.player.y) > 1600 || solid(w, tx, ty) || solid(w, tx, ty - 1) || !solid(w, tx, ty + 1))
                    continue;
                const b = biome(w.settings, tx, ty), roster: Kind[] = b === 'Crystal depths' ? ['caster', 'sentinel', 'drone'] : b === 'Rust wastes' ? ['crawler', 'gunner', 'drone'] : ['crawler', 'hopper'];
                const kind = roster[Math.floor(hash(w.settings.seed, tx, ty, 'roster') * roster.length)];
                this.createEnemy(kind,x,y,id);
                break;
            }
        }
        createEnemy(kind:Kind,x:number,y:number,id:string){
            const stats=ENEMIES[kind];const f=this.foes.create(x,y,stats.texture) as Phaser.Physics.Arcade.Sprite;
            f.setSize(kind==='sentinel'?32:24,kind==='drone'?24:32);
            f.setData({id,kind,hp:stats.hp,homeX:x,homeY:y,state:'patrol',until:this.clock+1000,dir:-1,memory:0,lastSeen:x,stun:0,nextThink:this.clock+hash(store.world.settings.seed,x,y,'ai-phase')*100});
            if(kind==='drone')(f.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
        }
        ai() {
            for (const obj of this.foes.getChildren()) {
                const f = obj as Phaser.Physics.Arcade.Sprite, kind = f.getData('kind') as Kind, p = ENEMIES[kind], body = f.body as Phaser.Physics.Arcade.Body, dx = this.player.x - f.x, dy = this.player.y - f.y, dist = Math.hypot(dx, dy), home = f.getData('homeX') as number;
                if (dist > 1800 || !this.chunks.has(Math.floor(f.x / (CHUNK * TILE)), Math.floor(f.y / (CHUNK * TILE)))) {
                    f.destroy();
                    continue;
                }
                if (this.clock < f.getData('nextThink')) continue;
                f.setData('nextThink', this.clock + 100);
                if (f.getData('dying') || this.clock < f.getData('stun'))
                    continue;
                const sight = dist < p.range && !this.nearBase() && clearLine(store.world, f.x, f.y, this.player.x, this.player.y);
                if (sight) {
                    f.setData('memory', this.clock + 1500);
                    f.setData('lastSeen', this.player.x);
                }
                const pursuit = Math.abs(f.x - home) < 340;
                let direction = Math.sign((sight && pursuit ? this.player.x : this.clock < f.getData('memory') && pursuit ? f.getData('lastSeen') : home) - f.x) || 1;
                let state = f.getData('state') as string;
                const until = f.getData('until') as number;
                f.clearTint();
                f.setScale(1);
                if (state === 'windup') {
                    f.setVelocityX(0);
                    f.setTint(0xffbc77);
                    f.setScale(1.08, .93);
                    if (this.clock < until)
                        continue;
                    if (kind === 'hopper') {
                        const landingX = Math.floor((f.x + direction * 85) / TILE);
                        const landingY = Math.floor(body.bottom / TILE);
                        const safeLanding = [0,1,2,3].some(dy => solid(store.world,landingX,landingY+dy) && !solid(store.world,landingX,landingY+dy-1));
                        f.setVelocity(safeLanding ? direction * 160 : 0, -390);
                        state = 'recover';
                        f.setData('until', this.clock + 1100);
                    }
                    else if (kind === 'sentinel') {
                        f.setVelocityX(direction * 180);
                        state = 'charge';
                        f.setData('until', this.clock + 420);
                    }
                    else {
                        if (sight && this.hostile.countActive() < 24) {
                            const shot = this.hostile.create(f.x, f.y, kind === 'caster' ? 'magic' : 'hostile') as Phaser.Physics.Arcade.Sprite;
                            shot.setTint(0xff847a);
                            const v = new Phaser.Math.Vector2(dx, dy).normalize().scale(kind === 'caster' ? 145 : 220);
                            shot.setVelocity(v.x, v.y);
                            shot.setData({ damage: p.damage, expires: this.clock + 2400 });
                        }
                        state = kind === 'gunner' ? 'burst' : 'recover';
                        f.setData('remaining',2);
                        f.setData('until', this.clock + (kind === 'gunner' ? 180 : kind === 'caster' ? 1600 : 1100));
                    }
                    f.setData('state', state);
                    continue;
                }
                if (state === 'burst') {
                    f.setVelocityX(0);
                    if(this.clock >= until){
                        if(sight && this.hostile.countActive()<24){const shot=this.hostile.create(f.x,f.y,'hostile') as Phaser.Physics.Arcade.Sprite;const v=new Phaser.Math.Vector2(dx,dy).normalize().scale(220);shot.setVelocity(v.x,v.y);shot.setData({damage:p.damage,expires:this.clock+2400});}
                        const remaining=Number(f.getData('remaining'))-1;f.setData({remaining,state:remaining>0?'burst':'recover',until:this.clock+(remaining>0?180:1300)});
                    }
                    continue;
                }
                if (state === 'charge') {
                    if (this.clock < until && !body.blocked.left && !body.blocked.right && solid(store.world,Math.floor((f.x+Math.sign(body.velocity.x)*32)/TILE),Math.floor((body.bottom+8)/TILE)))
                        continue;
                    state = 'recover';
                    f.setData('until', this.clock + 1500);
                    f.setVelocityX(0);
                    f.setData('state', state);
                    continue;
                }
                if (state === 'recover' && this.clock < until) {
                    if (kind === 'drone')
                        f.setVelocityX(-direction * 60);
                    else if (kind !== 'hopper')
                        f.setVelocityX(0);
                    continue;
                }
                if (sight && pursuit && (kind !== 'crawler') && this.clock >= until) {
                    if (kind === 'hopper' || kind === 'sentinel' && dist < 120 || kind === 'caster' && dist < 350 || kind === 'gunner' && dist < 370 || kind === 'drone' && dist < 260) {
                        f.setData({ state: 'windup', until: this.clock + (kind === 'sentinel' ? 700 : kind === 'caster' ? 850 : 500) });
                        continue;
                    }
                }
                state = sight && pursuit ? 'chase' : this.clock < f.getData('memory') && pursuit ? 'investigate' : Math.abs(f.x - home) > 100 ? 'return' : 'patrol';
                f.setData('state', state);
                if (sight && (kind === 'caster' || kind === 'gunner') && dist < 160)
                    direction = -Math.sign(dx);
                if (state === 'patrol') {
                    direction = f.getData('dir');
                    if (Math.abs(f.x - home) > 100)
                        direction = Math.sign(home - f.x);
                }
                if (kind === 'drone') {
                    const targetY = sight && pursuit ? this.player.y - 45 : f.getData('homeY') - 40;
                    let vx = direction * p.speed, vy = Phaser.Math.Clamp((targetY - f.y) * 1.5, -65, 65);
                    if (!clearLine(store.world, f.x, f.y, f.x + direction * 45, f.y)) {
                        vx = 0;
                        vy = solid(store.world, Math.floor(f.x / TILE), Math.floor((f.y - 45) / TILE)) ? 45 : -45;
                    }
                    if (Math.abs(f.y - f.getData('homeY')) > 200)
                        vy = Math.sign(f.getData('homeY') - f.y) * 65;
                    f.setVelocity(vx, vy);
                }
                else {
                    const tx = Math.floor((f.x + direction * 24) / TILE), ty = Math.floor((body.bottom + 8) / TILE), floor = solid(store.world, tx, ty);
                    if (body.blocked.left || body.blocked.right) {
                        if (sight && (body.blocked.down || body.touching.down) && !solid(store.world, tx, ty - 2) && solid(store.world, tx, ty - 1))
                            f.setVelocityY(-330);
                        else
                            direction = -direction;
                    }
                    if (!floor) {
                        direction = -direction;
                        f.setData('memory', 0);
                    }
                    f.setData('dir', direction);
                    f.setVelocityX(direction * p.speed);
                    if (kind === 'hopper' && !sight && this.clock > until) {
                        f.setData({ state: 'windup', until: this.clock + 900 });
                    }
                }
                f.setFlipX(direction > 0);
            }
        }
        lastLighting = 0;
        drawEnvironment() {
            if (this.clock - this.lastLighting < 100 && this.lastLighting > 0)
                return;
            this.lastLighting = this.clock;
            const tx = Math.floor(this.player.x / TILE), ty = Math.floor(this.player.y / TILE), b = biome(store.world.settings, tx, ty), cam = this.cameras.main;
            this.sky.clear();
            const color = b === 'Rust wastes' ? 0x42333c : b === 'Crystal depths' ? 0x171c35 : 0x193a48;
            this.sky.fillStyle(color);
            this.sky.fillRect(0, 0, 960, 540);
            this.stars.clear();
            this.stars.fillStyle(b === 'Rust wastes' ? 0x765547 : 0x2d5261, .5);
            for (let i = -1; i < 9; i++) {
                const x = i * 190 - ((cam.scrollX * .15) % 190);
                this.stars.fillTriangle(x, 430, x + 115, 150 + (i % 3) * 55, x + 260, 430);
            }
            this.stars.fillStyle(0xc6e9d5, .6);
            for (let i = 0; i < 16; i++)
                this.stars.fillCircle((i * 173 - cam.scrollX * .06) % 1000, 50 + (i * 67) % 300, 1);
            this.light.clear();
            const depth = ty - surface(store.world.settings, tx);
            if (depth > 6) {
                const sources = [{ x: this.player.x - cam.scrollX, y: this.player.y - cam.scrollY, r: 170 }];
                for (let x = tx - 23; x <= tx + 23; x++)
                    for (let y = ty - 13; y <= ty + 13; y++) {
                        const material = readTile(store.world, x, y);
                        if (material === 8 || material === 4 && hash(store.world.settings.seed, x, y, 'glow') > .9)
                            sources.push({ x: (x + .5) * TILE - cam.scrollX, y: (y + .5) * TILE - cam.scrollY, r: material === 8 ? 145 : 65 });
                    }
                for (let x = 0; x < 960; x += 32)
                    for (let y = 0; y < 540; y += 32) {
                        let alpha = .58;
                        for (const light of sources)
                            alpha = Math.min(alpha, Math.max(0, Math.hypot(x + 16 - light.x, y + 16 - light.y) / light.r - .35) * .58);
                        if (alpha > .02) {
                            this.light.fillStyle(0x050817, alpha);
                            this.light.fillRect(x, y, 32, 32);
                        }
                    }
            }
        }
        update(_t: number, delta: number) {
            if (!this.player || disposed)
                return;
            this.chunks.ensure(this.player.x, this.player.y);
            this.chunks.step();
            if (this.decorDirty) {
                this.decorDirty = false;
                this.chunks.refreshDecor();
            }
            if (this.status !== 'playing') {
                this.physics.pause();
                this.drawEnvironment();
                return;
            }
            if (!this.chunks.ready(this.player.x, this.player.y)) {
                this.physics.pause();
                this.player.setPosition(this.safe.x, this.safe.y);
                this.notify('Surveying nearby terrain…');
                return;
            }
            this.physics.resume();
            this.safe = { x: this.player.x, y: this.player.y };
            this.clock += Math.min(delta, 50);
            const m = MOVEMENT, b = this.player.body as Phaser.Physics.Arcade.Body, grounded = b.blocked.down || b.touching.down;
            if (grounded) {
                if (this.jumped)
                    this.burst(this.player.x, this.player.y + 20, 0xb7b794);
                this.lastGround = this.clock;
                this.jumped = false;
            }
            if (this.fresh.has('Space'))
                this.buffer = this.clock;
            if (this.clock - this.buffer <= m.bufferMs && this.clock - this.lastGround <= m.coyoteMs && !this.jumped) {
                this.player.setVelocityY(-m.jump);
                this.jumped = true;
                this.buffer = -1000;
                this.lastGround = -1000;
            }
            if (!this.held.has('Space') && b.velocity.y < -330)
                this.player.setVelocityY(-330);
            const direction = Number(this.held.has('KeyD') || this.held.has('ArrowRight')) - Number(this.held.has('KeyA') || this.held.has('ArrowLeft'));
            if (this.clock >= this.knockUntil) {
                this.player.setAccelerationX(direction * m.acceleration).setDragX(direction ? 0 : m.deceleration);
            }
            if (direction) {
                this.facing = direction;
                if (this.recallStart) {
                    this.recallStart = 0;
                    this.notify('Recall cancelled by movement.');
                }
            }
            this.player.setFlipX(this.facing < 0);
            const hurt = this.clock < this.hurtUntil;
            this.player.setAlpha(hurt && Math.floor(this.clock / 80) % 2 ? .45 : 1);
            this.player.setTexture(`${store.data.profile.equipped}-${hurt ? 'hurt' : !grounded ? b.velocity.y < 0 ? 'air' : 'fall' : direction ? `run${Math.floor(this.clock / 100) % 2}` : 'idle'}`);
            const item = store.world.inventory[this.selected]?.id;
            this.weapon.setTexture(item === 'sword' ? 'sword-tool' : item === 'staff' ? 'staff-tool' : ['pickaxe', 'drill'].includes(item ?? '') ? 'pick-tool' : 'gun-tool').setVisible(!!item);
            const angle = this.cursor.known ? Math.atan2(this.cursor.y - this.player.y, this.cursor.x - this.player.x) : this.facing < 0 ? Math.PI : 0;
            this.weapon.setPosition(this.player.x + this.facing * 10, this.player.y + 3).setRotation(angle).setFlipY(Math.cos(angle) < 0);
            const { x, y } = this.targetTile();
            this.target.clear();
            if (['pickaxe', 'drill', 'dirt', 'stone', 'brick', 'torch'].includes(item ?? '')) {
                this.target.lineStyle(2, this.inReach(x, y) ? 0x8df6d1 : 0xef998c, .8);
                this.target.strokeRect(x * TILE, y * TILE, TILE, TILE);
            }
            if (this.held.has('Mouse') || this.held.has('KeyJ') || this.fresh.has('KeyJ')) {
                if (item === 'pickaxe' || item === 'drill')
                    this.mine(Math.min(delta, 50));
                else
                    this.attack();
            }
            else
                this.mining.progress = 0;
            if (this.fresh.has('KeyF') || this.fresh.has('RightMouse'))
                this.place();
            if (this.fresh.has('KeyE'))
                this.interact();
            if (this.fresh.has('KeyH'))
                this.recall();
            if (this.recallStart && this.clock - this.recallStart >= 2500) {
                this.respawn();
                void this.save().catch(() => { });
            }
            if (this.clock - this.lastMagic > 1800)
                this.mana = Math.min(100, this.mana + delta * .018);
            for (const group of [this.shots, this.hostile])
                for (const s of group.getChildren())
                    if (this.clock > (s as Phaser.Physics.Arcade.Sprite).getData('expires'))
                        s.destroy();
            if (this.clock - this.lastAi > 30) {
                this.ai();
                this.lastAi = this.clock;
            }
            if (this.clock - this.lastSpawn > 600) {
                this.spawn();
                this.lastSpawn = this.clock;
            }
            const key = `${Math.floor(this.player.x / (TILE * CHUNK))},${Math.floor(this.player.y / (TILE * CHUNK))}`;
            if (key !== this.lastExplore) {
                this.lastExplore = key;
                const name = biome(store.world.settings, Math.floor(this.player.x / TILE), Math.floor(this.player.y / TILE));
                void this.transact((_b, w) => { w.explored[key] = name; if (name !== 'Verdant frontier')
                    w.progress.biome = 1; });
            }
            if (this.player.y > (DEPTH - 2) * TILE || Math.abs(this.player.x) > WORLD_LIMIT * TILE - 80) {
                this.health = 0;
                this.status = 'dead';
                this.physics.pause();
                this.emit();
            }
            this.drawEnvironment();
            if (this.clock - this.lastHud > 180) {
                this.emit();
                this.lastHud = this.clock;
                store.schedulePosition(this.player.x, this.player.y, this.selected);
            }
            this.fresh.clear();
        }
    }
    const game = new Phaser.Game({ type: Phaser.AUTO, parent: host, width: 960, height: 540, pixelArt: true, roundPixels: true, banner: false, audio: { noAudio: true }, physics: { default: 'arcade', arcade: { gravity: { x: 0, y: MOVEMENT.gravity }, fps: 120 } }, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: [WorldScene] });
    host.tabIndex = 0;
    const save = () => scene?.save() ?? Promise.resolve();
    const keydown = (e: KeyboardEvent) => { if (document.activeElement !== host || !scene)
        return; if (['Space', 'ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'KeyJ', 'KeyE', 'KeyF', 'KeyH', 'Escape', 'KeyR', 'KeyI', 'KeyC', 'KeyM'].includes(e.code) || /^Digit[1-8]$/.test(e.code))
        e.preventDefault(); if (e.repeat)
        return; if (/^Digit[1-8]$/.test(e.code)) {
        scene.selected = Number(e.code.slice(-1)) - 1;
        scene.emit();
        return;
    } if (e.code === 'Escape') {
        if (scene.status === 'paused')
            scene.resume();
        else
            scene.pause();
        return;
    } if (e.code === 'KeyR' && scene.status === 'dead') {
        scene.respawn();
        return;
    } if (['KeyI', 'KeyC', 'KeyM'].includes(e.code)) {
        scene.pause();
        onMenu(e.code === 'KeyI' ? 'inventory' : e.code === 'KeyC' ? 'crafting' : 'map');
        return;
    } if (['KeyA', 'KeyD', 'ArrowLeft', 'ArrowRight'].includes(e.code))
        scene.cursor.known = false; scene.held.add(e.code); scene.fresh.add(e.code); };
    const keyup = (e: KeyboardEvent) => scene?.held.delete(e.code);
    const move = (e: PointerEvent) => { if (!scene?.player)
        return; const r = host.getBoundingClientRect(); const p = scene.cameras.main.getWorldPoint((e.clientX - r.left) * 960 / r.width, (e.clientY - r.top) * 540 / r.height); scene.cursor = { x: p.x, y: p.y, known: true }; };
    const down = (e: PointerEvent) => { host.focus(); if (!scene || scene.status !== 'playing')
        return; move(e); if (e.button === 0)
        scene.held.add('Mouse'); if (e.button === 2)
        scene.fresh.add('RightMouse'); };
    const up = () => scene?.held.delete('Mouse');
    const blur = () => {if(!verification)scene?.pause();};
    const hidden = () => { if (document.hidden)
        blur(); };
    const context = (e: Event) => e.preventDefault();
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    window.addEventListener('pointerup', up);
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', hidden);
    host.addEventListener('pointermove', move);
    host.addEventListener('pointerdown', down);
    host.addEventListener('contextmenu', context);
    host.addEventListener('blur', blur);
    return { resume: () => { host.focus(); scene?.resume(); }, pause: () => scene?.pause(), select: n => { if (scene) {
            scene.selected = n;
            scene.emit();
        } }, recall: () => { host.focus(); scene?.resume(); scene?.recall(); }, respawn: () => { host.focus(); scene?.respawn(); }, save, setShake: b => { if (scene)
            scene.shake = b; }, destroy: () => { disposed = true; window.removeEventListener('keydown', keydown); window.removeEventListener('keyup', keyup); window.removeEventListener('pointerup', up); window.removeEventListener('blur', blur); document.removeEventListener('visibilitychange', hidden); host.removeEventListener('pointermove', move); host.removeEventListener('pointerdown', down); host.removeEventListener('contextmenu', context); host.removeEventListener('blur', blur); game.destroy(true); } };
}
