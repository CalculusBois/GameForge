import { CreatorRenderer } from '../creator/renderer';
import type { CreationSpec } from '../creator/spec';
import { GameSound } from './sound';
import { gameAudio } from './audio';
import { bossSites } from './bossSites';
import { BOSS_REGISTRY } from './registry/bosses';
import { MODULAR_WARDROBE } from './registry/cosmetics';
import { GUN_FAMILIES } from './customization';
import { Wildlife } from './wildlife';
import { ANIMAL_REGISTRY, BIOME_VARIANTS } from './model';
import { advanceWorld, harvestCrop } from './simulation';
import { FOOD_PROFILES, eatFood } from './model';
import Phaser from 'phaser';
import { MOVEMENT } from '../platformer/config';
import { sandboxAssets } from './assets';
import { heldGunTextureKey } from './itemIcons';
import { ChunkManager } from './chunks';
import { SaveStore } from './persistence';
import { ENEMIES, FLYING, ELITE_MODIFIERS, type Kind } from './enemies';
import {
  TILE,
  CHUNK,
  DEPTH,
  WORLD_LIMIT,
  ITEMS,
  MATERIALS,
  BUILDING,
  WEAPONS,
  add,
  remove,
  count,
  chest,
  derivePlayerStats,
  useVitalityCore,
  useManaCore,
  tickStatusEffects,
  createStatusEffect,
  markOnboarding,
  noteDiscovery,
  type ActiveStatusEffect,
  type StatusEffectType,
  TOTEM_REGISTRY,
  type Biome,
  type ItemId,
} from './model';
import { forgeBossReward } from './registry/economy';
import { readTile, editTile, clearLine, solid, biome, surface, hash, harvestables, landmarks, protectedTile, inOutpost, OUTPOST_X, clearUnsupportedHarvest, sweepUnsupportedHarvest, HARVEST_MS, calculateSafeSurfaceSpawnY, type Harvest } from './terrain';
import { sessionStart_ as analyticsStart, track as analyticsTrack } from '../analytics';
import { getToolProfile } from './registry/toolsAndWeapons';
export type Menu = 'inventory' | 'crafting' | 'cooking' | 'skins' | 'objectives' | 'shop' | 'map' | 'worlds' | 'settings' | 'stats' | 'forge' | 'storage' | null;
export interface SandboxHud {
    aiMeters?: {id:string;label:string;icon:string;color:string;value:number;maximum:number;remaining:number}[];
    health: number;
    maxHealth: number;
    mana: number;
    maxMana: number;
    hunger: number;
    ammo?: number;
    storageKey?: string;
    boss?: { name: string; hp: number; maxHp: number; phase: number };
    defense: number;
    status: 'playing' | 'paused' | 'loading' | 'dead';
    biome: Biome;
    selected: number;
    message: string;
    nearBase: boolean;
    nearCrafting?: boolean;
    nearFurnace?: boolean;
    nearCooking?: boolean;
    stationFocus?: 'workbench' | 'forge' | 'furnace' | 'cooking' | 'terminal';
    fps: number;
    chunks: number;
    enemies: number;
    bodies: number;
    x: number;
    y: number;
    recall: number;
    activeEffects: { type: string; name: string; icon: string; remainingMs: number }[];
    bossHunt?: { id: string; name: string; tiles: number; dir: string; defeated: boolean }[];
}
export interface PlayerSessionSnapshot { health:number;mana:number;effects:ActiveStatusEffect[];shieldBudget:number; }
export interface SandboxController {
    capturePlayer: () => PlayerSessionSnapshot | undefined;
    resume: () => void;
    pause: () => void;
    select: (n: number) => void;
    recall: () => void;
    respawn: () => void;
    save: () => Promise<void>;
    destroy: () => void;
    setShake: (b: boolean) => void;
    setVolume: (n: number) => void;
    setHealth: (n: number) => void;
    setMana: (n: number) => void;
    setHunger: (n: number) => void;
    feedback: () => void;
    applyCreation: (spec: CreationSpec, at?: { x: number; y: number }) => CreationSpec;
    removeCreation: (id: string) => void;
    resetCreations: () => void;
    castBlink?: () => void;
    castShield?: () => void;
    eatItem?: (slot: number) => void;
}
export interface VerificationPort {
    read:()=>{x:number;y:number;vx:number;vy:number;grounded:boolean;blockedLeft:boolean;blockedRight:boolean;health:number;mana:number;status:string;clock:number;chunks:number;bodies:number;fps:number;busy:boolean;message:string;recall:number;enemies:{id:string;kind:Kind;x:number;y:number;hp:number;state:string}[]};
    hold:(keys:string[])=>void; aim:(x:number,y:number)=>void; select:(slot:number)=>void;resume:()=>void;pause:()=>void;recall:()=>void;respawn:()=>void;save:()=>Promise<void>;
    encounter:(kind:Kind,x:number,y:number,id:string)=>void;
    creatorRead?:()=>{actors:number;defeated:number;health:number;shots:number;swordShots:number;meters:number;meterValue:number;activeEffects:number;textures:number;objects:number;time:number};
    creatorBuildup?:(source:string)=>void;
    castBlink?:()=>void;castShield?:()=>void;
}
function parseHexColor(hex?:string,fallback=0xe5484d){const n=parseInt(hex?.replace('#','')??'',16);return Number.isNaN(n)?fallback:n;}
function isBossLike(f: Phaser.Physics.Arcade.Sprite) {
    const kind = f.getData('kind') as string | undefined;
    return !!(f.getData('boss') || f.getData('showcase') || f.getData('creator') || (kind && BOSS_REGISTRY[kind]));
}
function applyBossHurtbox(f: Phaser.Physics.Arcade.Sprite) {
    const kind = f.getData('kind') as string | undefined;
    const def = kind ? BOSS_REGISTRY[kind] : undefined;
    const fw = Math.max(1, f.frame?.width || f.width || 64);
    const fh = Math.max(1, f.frame?.height || f.height || 80);
    // Keep the tile collider compact so bosses do not embed in blocks. Weapon hits use the visible sprite in shotsVsBosses.
    const bw = Math.round((def?.collider.width ?? 52) * 1.15);
    const bh = Math.round((def?.collider.height ?? 64) * 1.15);
    f.setSize(bw, bh);
    f.setOffset((fw - bw) / 2, (fh - bh) / 2);
}
function dressProjectile(shot: Phaser.Physics.Arcade.Sprite) {
    const body = shot.body as Phaser.Physics.Arcade.Body | undefined;
    if (!body) return shot;
    body.setCircle(14, -6, -6);
    return shot;
}
function shadeRgb(c: number, f: number) {
    const r = Math.min(255, Math.max(0, Math.round(((c >> 16) & 255) * f)));
    const g = Math.min(255, Math.max(0, Math.round(((c >> 8) & 255) * f)));
    const b = Math.min(255, Math.max(0, Math.round((c & 255) * f)));
    return (r << 16) | (g << 8) | b;
}
export function startSandbox(host: HTMLElement, store: SaveStore, onHud: (h: SandboxHud) => void, onMenu: (m: Menu) => void, verification?: (port:VerificationPort)=>void, restore?:PlayerSessionSnapshot): SandboxController {
    const sound = new GameSound();
    let scene: WorldScene | undefined, disposed = false;
    class WorldScene extends Phaser.Scene {
        player!: Phaser.Physics.Arcade.Sprite;
        weapon!: Phaser.GameObjects.Image;
        outfit!: Phaser.GameObjects.Graphics;
        chunks!: ChunkManager;
        foes!: Phaser.Physics.Arcade.Group;
        wildlife!: Wildlife;
        shots!: Phaser.Physics.Arcade.Group;
        hostile!: Phaser.Physics.Arcade.Group;
        target!: Phaser.GameObjects.Graphics;
        bossArt!: Phaser.GameObjects.Graphics;
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
        saberReflectUntil = 0;
        creator?: CreatorRenderer;
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
        gathering = { id: '', progress: 0, kind: 'herb' as Harvest['kind'] };
        fallPeak = 0;
        fallStartY = 0;
        fallAirSince = 0;
        wasGrounded = true;
        busy = false;
        message = 'Hold E to chop trees (~1.2s) · Mine iron with J · Visit the workbench';
        noticeUntil = 0;
        safe = { x: 0, y: 0 };
        decorDirty = false;
        dropThroughUntil = 0;
        lastLavaDamage = 0;
        burningUntil = 0;
        activeEffects: ActiveStatusEffect[] = [];
        lastTotemScan = -1000;
        nearVitalityTotem = false;
        nearWardingTotem = false;
        nearProspectorTotem = false;
        nearArcaneTotem = false;
        lastShield = -1000;
        shieldBudget = 0;
        simulationMs = 0;
        simulationBusy = false;
        storageKey?: string;
        spawnGraceUntil = 6000;
        constructor() { super('Sandbox'); scene = this; }
        addEffect(type: StatusEffectType, durationMs?: number, magnitude: number = 1) {
            const existing = this.activeEffects.find(e => e.type === type);
            if (existing) {
                existing.remainingMs = Math.max(existing.remainingMs, durationMs ?? 5000);
            } else {
                this.activeEffects.push(createStatusEffect(type, durationMs, magnitude));
            }
        }
        create() {
            analyticsStart(store.world.id, store.world.settings.difficulty);
            sandboxAssets(this);
            if(restore){this.health=restore.health;this.mana=restore.mana;this.activeEffects=structuredClone(restore.effects);this.shieldBudget=restore.shieldBudget;}
            for (const [id,boss] of Object.entries(BOSS_REGISTRY)) ENEMIES[id] = {
                name: boss.name, texture: id, hp: boss.maxHp, damage: boss.damage, speed: boss.speed, range: 600,
                reward: boss.coinReward, collider: boss.collider,
                baseType: boss.baseClass === 'BaseFlyingBoss' ? 'drone' : 'sentinel',
                baseClass: boss.baseClass, flying: boss.baseClass === 'BaseFlyingBoss',
                attackPattern: { type: 'ProjectileBurst', burstCount: 4, projectileColor: boss.phases[0]?.attacks[0]?.telegraphColor || '#ffb74d' },
            };
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
            this.outfit = this.add.graphics().setDepth(10.5);
            this.bossArt = this.add.graphics().setDepth(15);
            this.weapon = this.add.image(p.x + 20, p.y, 'gun-tool').setOrigin(.15, .5).setDepth(11);
            this.foes = this.physics.add.group();
            this.wildlife = new Wildlife(this, () => store.world);
            this.physics.add.collider(this.wildlife.group, this.chunks.terrain);
            this.shots = this.physics.add.group({ allowGravity: false });
            this.hostile = this.physics.add.group({ allowGravity: false });
            this.physics.add.collider(this.player, this.chunks.terrain);
            this.physics.add.collider(this.foes, this.chunks.terrain);
            this.physics.add.collider(this.shots, this.chunks.terrain, s => {
                const shot = s as Phaser.Physics.Arcade.Sprite;
                if (shot.getData('isExplosive')) {
                    this.explodeShot(shot.x, shot.y, shot.getData('damage') || 56);
                }
                this.burst(shot.x, shot.y, 0x82eeef);
                s.destroy();
            });
            this.physics.add.collider(this.hostile, this.chunks.terrain, s => s.destroy());
            // Enemy projectiles pass through other mobs — no friendly fire
            this.physics.add.overlap(this.hostile, this.foes, () => { /* allies ignore hostile bolts */ });
            this.physics.add.overlap(this.shots, this.foes, (s, f) => {
                this.connectShot(s as Phaser.Physics.Arcade.Sprite, f as Phaser.Physics.Arcade.Sprite);
            });
            this.physics.add.overlap(this.shots, this.wildlife.group, (shot, animal) => {
                const projectile = shot as Phaser.Physics.Arcade.Sprite;
                if (projectile.active) { this.hit(animal as Phaser.Physics.Arcade.Sprite, projectile.getData('damage')); projectile.destroy(); }
            });
            this.physics.add.overlap(this.player, this.wildlife.group, (_p, obj) => {
                const a = obj as Phaser.Physics.Arcade.Sprite;
                if (a.getData('retaliating')) this.damage(ANIMAL_REGISTRY[a.getData('species')].retaliateDamage ?? 1, a.x);
            });
            this.physics.add.overlap(this.player, this.foes, (_p, f) => { const foe = f as Phaser.Physics.Arcade.Sprite; if (!foe.getData('dying'))
                { if(foe.getData('creator')) { this.creator?.runtime.contact(foe.getData('creator'));return; } const kind = foe.getData('kind') as Kind; if (kind === 'explosion_bot') return; const elite = (foe.getData('eliteDamage') as number) || 1; this.damage(Math.ceil((ENEMIES[kind]?.damage ?? 10) * elite), foe.x); if (!this.nearBase() && kind.includes('frost')) this.addEffect('slowing',1500,.2); if (!this.nearBase() && kind.includes('fungal')) this.addEffect('poison',2000,1); } });
            this.physics.add.overlap(this.player, this.hostile, (_p, s) => {
                const shot = s as Phaser.Physics.Arcade.Sprite;
                if (this.reflectLightsaberShot(shot)) return;
                this.damage(shot.getData('damage'), shot.x, 'enemy-projectile');
                shot.destroy();
            });
            this.target = this.add.graphics().setDepth(12);
            this.light = this.add.graphics().setDepth(20).setScrollFactor(0);
            this.drawBase();
            this.cameras.main.setBounds(-WORLD_LIMIT * TILE, 0, WORLD_LIMIT * TILE * 2, DEPTH * TILE);
            this.cameras.main.centerOn(this.player.x, this.player.y - 30);
            this.cameras.main.startFollow(this.player, true, .13, .13, 0, 30);
            this.cameras.main.setDeadzone(110, 60);
            this.chunks.ensure(p.x, p.y);
            while (this.chunks.pending.length) this.chunks.step();
            this.physics.pause();
            this.emit();
            this.restoreWorldCreations();
            if (w.settings.difficulty === 'boss' && w.generator >= 2) {
                void this.transact((_b, world) => {
                    world.discoveredBosses ??= [];
                    let added = 0;
                    for (const site of bossSites(world.settings)) {
                        if (!world.discoveredBosses.includes(site.id)) {
                            world.discoveredBosses.push(site.id);
                            added++;
                        }
                    }
                    if (added) return 'Boss mode: shrines are marked on the HUD and map. Follow the arrows and press E.';
                });
            }
            if(import.meta.env.DEV&&verification)verification({
                read:()=>{const body=this.player.body as Phaser.Physics.Arcade.Body;return {x:this.player.x,y:this.player.y,vx:body.velocity.x,vy:body.velocity.y,grounded:body.blocked.down||body.touching.down,blockedLeft:body.blocked.left,blockedRight:body.blocked.right,health:this.health,mana:this.mana,status:this.status,clock:this.clock,chunks:this.chunks.active.size,bodies:this.chunks.bodyCount,fps:this.game.loop.actualFps,busy:this.busy,message:this.message,recall:this.recallStart,enemies:this.foes.getChildren().map(obj=>{const f=obj as Phaser.Physics.Arcade.Sprite;return {id:f.getData('id'),kind:f.getData('kind'),x:f.x,y:f.y,hp:f.getData('hp'),state:f.getData('state')};})};},
                hold:keys=>{const next=new Set(keys);for(const key of next)if(!this.held.has(key))this.fresh.add(key);this.held=next;},
                aim:(x,y)=>{this.cursor={x,y,known:true};},select:n=>{this.selected=n;},resume:()=>this.resume(),pause:()=>this.pause(),recall:()=>this.recall(),respawn:()=>this.respawn(),save:()=>this.save(),
                encounter:(kind,x,y,id)=>{if(this.foes.countActive()<(store.world.settings.difficulty==='extreme'?120:24))this.createEnemy(kind,x,y,id);},
                creatorRead:()=>this.creator?.read()??{actors:0,defeated:0,health:0,shots:0,swordShots:0,meters:0,meterValue:0,activeEffects:0,textures:0,objects:this.children.length,time:0},
                creatorBuildup:source=>this.creator?.runtime.buildup(source),
                castBlink:()=>this.castBlink(),castShield:()=>this.castShield()
            });
        }
        drawBase() {
            const y = 22 * TILE, g = this.add.graphics().setDepth(2);
            g.fillStyle(0x1b3645); g.fillRect(6 * TILE, y - 104, 23 * TILE, 104);
            g.lineStyle(3, 0x83bcbb); g.strokeRect(6 * TILE, y - 104, 23 * TILE, 104);
            g.fillStyle(0x35515a); g.fillRect(6 * TILE, y - 104, 23 * TILE, 10);
            g.fillStyle(0x85eace); g.fillRect(8 * TILE, y - 65, 7, 60);
            for (const [x, name, color] of [[12, 'WORKBENCH', 0xcca176], [16, 'FORGE', 0xf0ae6d], [20, 'COOKING', 0xe08a4a], [25, 'MARKET', 0xf0cb87]] as const) {
                if (name === 'MARKET') {
                    g.fillStyle(0xa33b3b);
                    g.fillTriangle(x * TILE - 24, y - 34, x * TILE, y - 56, x * TILE + 24, y - 34);
                    g.fillStyle(0xc45a4a);
                    g.fillRect(x * TILE - 22, y - 36, 44, 8);
                    g.fillStyle(0x6d4c3d);
                    g.fillRect(x * TILE - 20, y - 28, 40, 28);
                    g.fillStyle(0xf0cb87);
                    g.fillRect(x * TILE - 18, y - 18, 36, 8);
                    g.fillStyle(0xffe08a);
                    g.fillCircle(x * TILE - 8, y - 22, 3);
                    g.fillCircle(x * TILE - 3, y - 20, 3);
                    g.fillCircle(x * TILE + 2, y - 22, 3);
                    g.fillStyle(0x62dfc3);
                    g.fillRect(x * TILE + 8, y - 32, 8, 12);
                    g.fillStyle(0xdce9ec);
                    g.fillRect(x * TILE + 9, y - 36, 6, 5);
                } else {
                    g.fillStyle(color);
                    g.fillRect(x * TILE - 18, y - 30, 36, 30);
                    if (name === 'COOKING') {
                        g.fillStyle(0x5a3a28);
                        g.fillRect(x * TILE - 10, y - 38, 3, 12);
                        g.fillRect(x * TILE + 7, y - 38, 3, 12);
                        g.fillStyle(0xc9c0a8);
                        g.fillRect(x * TILE - 10, y - 40, 20, 3);
                        g.fillStyle(0xff9a4a);
                        g.fillCircle(x * TILE, y - 18, 5);
                    }
                }
                this.add.text(x * TILE, y - 58, name, { fontFamily: 'monospace', fontSize: '9px', color: '#bce4dd' }).setOrigin(.5).setDepth(3);
            }
            this.add.text(8 * TILE, y - 86, 'LUMEN OUTPOST', { fontFamily: 'monospace', fontSize: '12px', color: '#94f3ce' }).setDepth(3);
        }
        nearStation(materials: number[]) {
            const tx=Math.floor(this.player.x/TILE),ty=Math.floor(this.player.y/TILE);
            for(let dx=-3;dx<=3;dx++)for(let dy=-2;dy<=2;dy++)if(materials.includes(readTile(store.world,tx+dx,ty+dy)))return true;
            return false;
        }
        stationFocus(): SandboxHud['stationFocus'] {
            const px = this.player.x, py = this.player.y;
            const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
            type Kind = NonNullable<SandboxHud['stationFocus']>;
            const hits: { kind: Kind; dist: number }[] = [];
            for (let dx = -3; dx <= 3; dx++) for (let dy = -2; dy <= 2; dy++) {
                const mat = readTile(store.world, tx + dx, ty + dy);
                const dist = Math.hypot(dx, dy);
                if (mat === 32 || mat === 35) hits.push({ kind: 'workbench', dist });
                if (mat === 33) hits.push({ kind: 'furnace', dist });
                if (mat === 34) hits.push({ kind: 'cooking', dist });
            }
            if (this.nearBase() && Math.abs(py - 22 * TILE) < 110) {
                for (const [sx, kind] of [[12, 'workbench'], [16, 'forge'], [20, 'cooking'], [25, 'terminal']] as const) {
                    const dist = Math.abs(px - sx * TILE) / TILE;
                    if (dist < 2.1) hits.push({ kind, dist });
                }
            }
            if (!hits.length) return undefined;
            hits.sort((a, b) => a.dist - b.dist);
            return hits[0]!.kind;
        }
        nearBase() { return inOutpost(this.player.x, this.player.y); }
        placeFoeOpen(f: Phaser.Physics.Arcade.Sprite, flying: boolean) {
            const w = store.world;
            const startTx = Math.floor(f.x / TILE), startTy = Math.floor(f.y / TILE);
            const spriteH = Math.max(f.displayHeight || 48, 48);
            const air = Math.max(4, Math.min(12, Math.ceil(spriteH / TILE) + 1));
            let found: { tx: number; ty: number } | undefined;
            for (const dx of [0, 1, -1, 2, -2, 3, -3, 4, -4, 6, -6, 8, -8, 10, -10, 12, -12]) {
                for (let dy = -12; dy <= 18; dy++) {
                    const tx = startTx + dx, ty = startTy + dy;
                    if (ty < 3 || ty >= DEPTH - 4) continue;
                    let blocked = false;
                    for (let i = 0; i < air; i++) if (solid(w, tx, ty - i)) { blocked = true; break; }
                    if (blocked) continue;
                    if (!flying && !solid(w, tx, ty + 1)) continue;
                    if (inOutpost((tx + 0.5) * TILE, (ty + 1) * TILE, 80)) continue;
                    found = { tx, ty };
                    break;
                }
                if (found) break;
            }
            if (found) {
                const x = (found.tx + 0.5) * TILE;
                const floor = (found.ty + 1) * TILE;
                const y = flying
                    ? floor - Math.min(spriteH * 0.5 + 24, Math.max(TILE * 3, air * TILE * 0.55))
                    : calculateSafeSurfaceSpawnY(floor, spriteH, false);
                f.setPosition(x, y);
                (f.body as Phaser.Physics.Arcade.Body | undefined)?.reset(x, y);
            }
            const body = f.body as Phaser.Physics.Arcade.Body | undefined;
            const hw = (body?.width ?? 28) / 2, hh = (body?.height ?? 32) / 2;
            for (let n = 0; n < 32; n++) {
                const samples = [
                    [f.x - hw + 3, f.y - hh + 3], [f.x + hw - 3, f.y - hh + 3], [f.x, f.y],
                    [f.x - hw + 3, f.y + hh - 3], [f.x + hw - 3, f.y + hh - 3],
                ];
                if (samples.every(([px, py]) => !solid(w, Math.floor(px / TILE), Math.floor(py / TILE)))) break;
                f.y -= 10;
                body?.reset(f.x, f.y);
            }
        }
        dressBoss(f: Phaser.Physics.Arcade.Sprite, kind: string, stats: (typeof ENEMIES)[string]) {
            const key = this.textures.exists(kind) ? kind : this.textures.exists(stats.texture) ? stats.texture : 'sentinel';
            try { if (f.texture.key !== key && this.textures.exists(key)) f.setTexture(key); } catch { /* keep current frame */ }
            const scale = store.world.settings.difficulty === 'boss' ? 2.15 : 1.7;
            f.setData('showScale', scale);
            f.setData('originFeet', false);
            f.setDepth(9);
            f.setOrigin(0.5, 0.5);
            f.setScale(scale);
            applyBossHurtbox(f);
        }
        connectShot(shot: Phaser.Physics.Arcade.Sprite, foe: Phaser.Physics.Arcade.Sprite) {
            if (!shot.active || !foe.active || foe.getData('dying')) return;
            let hitFoes = shot.getData('hitFoes') as Set<string> | undefined;
            if (!hitFoes) { hitFoes = new Set(); shot.setData('hitFoes', hitFoes); }
            const foeId = foe.getData('id') as string;
            if (hitFoes.has(foeId)) return;
            hitFoes.add(foeId);

            const dmg = shot.getData('damage');
            const eff = shot.getData('statusEffect');
            if (!shot.getData('isExplosive')) this.hit(foe, dmg, eff);
            if (shot.getData('chain')) {
                const visited = new Set([foe]); let from=foe;
                for(let n=0;n<2;n++) {
                    const target=(this.foes.getChildren() as Phaser.Physics.Arcade.Sprite[]).filter(f=>!visited.has(f)&&!f.getData('dying')&&Math.hypot(f.x-from.x,f.y-from.y)<130&&clearLine(store.world,from.x,from.y,f.x,f.y)).sort((a,b)=>Phaser.Math.Distance.Between(a.x,a.y,from.x,from.y)-Phaser.Math.Distance.Between(b.x,b.y,from.x,from.y))[0];
                    if(!target)break;this.hit(target,dmg*.7);visited.add(target);this.burst(target.x,target.y,0x18ffff);from=target;
                }
                shot.destroy();return;
            }

            if (shot.getData('isExplosive')) {
                this.explodeShot(shot.x, shot.y, dmg);
                shot.destroy();
                return;
            }

            const pierce = shot.getData('pierce');
            if (typeof pierce === 'number' && pierce > 1) {
                shot.setData('pierce', pierce - 1);
                this.burst(shot.x, shot.y, 0x82eeef);
            } else {
                shot.destroy();
            }
        }
        shotsVsBosses() {
            const shots = this.shots.getChildren() as Phaser.Physics.Arcade.Sprite[];
            const foes = this.foes.getChildren() as Phaser.Physics.Arcade.Sprite[];
            for (const shot of shots) {
                if (!shot.active) continue;
                for (const foe of foes) {
                    if (!foe.active || foe.getData('dying') || !isBossLike(foe)) continue;
                    const b = foe.getBounds();
                    const pad = 36;
                    if (shot.x < b.x - pad || shot.x > b.right + pad || shot.y < b.y - pad || shot.y > b.bottom + pad) continue;
                    this.connectShot(shot, foe);
                    if (!shot.active) break;
                }
            }
        }
        emit() {
            if(this.status==='dead')this.creator?.runtime.death();
            if (disposed || !this.player) return;
            const stats = derivePlayerStats(store.world, this.activeEffects);
            const activeList: { type: string; name: string; icon: string; remainingMs: number }[] = this.activeEffects.map(e => ({
                type: e.type,
                name: e.name,
                icon: e.icon,
                remainingMs: e.remainingMs,
            }));
            if (this.nearVitalityTotem) activeList.push({ type: 'vitality_aura', name: 'Vitality Aura', icon: '💚', remainingMs: 999000 });
            if (this.nearWardingTotem) activeList.push({ type: 'warding_aura', name: 'Warding Aura', icon: '🛡️', remainingMs: 999000 });
            if (this.nearProspectorTotem) activeList.push({ type: 'prospector_aura', name: 'Prospector Aura', icon: '⛏️', remainingMs: 999000 });
            if (this.nearArcaneTotem) activeList.push({ type: 'arcane_aura', name: 'Arcane Aura', icon: '✦', remainingMs: 999000 });

            const focus = this.stationFocus();
            if (this.clock >= this.noticeUntil) {
                if (focus === 'terminal') this.message = 'Market — press E to sell items and buy skins';
                else if (this.message.startsWith('Market —')) this.message = 'Hold E to chop trees (~1.2s) · Mine iron with J · Visit the workbench';
            }
            onHud({
                health: Math.ceil(this.health),
                maxHealth: stats.maxHealth,
                mana: Math.floor(this.mana),
                maxMana: stats.maxMana,
                hunger: store.world.hunger ?? 100,
                storageKey: this.storageKey,
                boss: (() => {
                    const nearby = (this.foes.getChildren() as Phaser.Physics.Arcade.Sprite[])
                        .filter(f => {
                            if (!f.active || f.getData('dying')) return false;
                            const kind = f.getData('kind') as string;
                            return !!(f.getData('boss') || f.getData('showcase') || f.getData('creator') || BOSS_REGISTRY[kind]);
                        })
                        .map(f => ({ f, d: Math.hypot(f.x - this.player.x, f.y - this.player.y) }))
                        .filter(n => n.d < 560 && !(this.nearBase() && n.f.getData('creator')))
                        .sort((a, b) => a.d - b.d)[0];
                    if (!nearby) return undefined;
                    const f = nearby.f;
                    const kind = f.getData('kind') as string;
                    const creatorId = f.getData('creator') as string | undefined;
                    const created = creatorId ? this.creator?.runtime.actors.get(creatorId) : undefined;
                    const name = created?.spec.name || BOSS_REGISTRY[kind]?.name || ENEMIES[kind]?.name || kind;
                    const hp = Math.ceil(f.getData('hp') || created?.hp || 0);
                    const maxHp = f.getData('maxHp') || created?.spec.stats.health || hp || 1;
                    return { name, hp, maxHp, phase: hp / maxHp < .5 ? 2 : 1 };
                })(),
                defense: stats.defense + (this.nearWardingTotem ? 5 : 0),
                status: this.status,
                biome: biome(store.world.settings, Math.floor(this.player.x / TILE), Math.floor(this.player.y / TILE)),
                selected: this.selected,
                message: this.message,
                nearBase: this.nearBase(),
                stationFocus: focus,
                nearCrafting: focus === 'workbench' || focus === 'forge',
                nearFurnace: focus === 'furnace',
                nearCooking: focus === 'cooking',
                ammo: count(store.world.inventory, 'ammo'),
                bossHunt: store.world.generator >= 2 ? bossSites(store.world.settings).map(site => {
                    const dx = site.x * TILE - this.player.x, dy = site.floor * TILE - this.player.y;
                    const dir = Math.abs(dx) >= Math.abs(dy) * 0.65 ? (dx >= 0 ? 'east' : 'west') : dy >= 0 ? 'below' : 'above';
                    return { id: site.id, name: BOSS_REGISTRY[site.id].name, tiles: Math.round(Math.hypot(dx, dy) / TILE), dir, defeated: store.world.defeated.includes(`boss:${site.id}`) };
                }) : undefined,
                fps: Math.round(this.game.loop.actualFps),
                chunks: this.chunks.active.size,
                enemies: this.foes.countActive(),
                bodies: this.chunks.bodyCount,
                x: this.player.x,
                y: this.player.y,
                recall: this.recallStart ? Math.min(1, (this.clock - this.recallStart) / 2500) : 0,
                activeEffects: activeList,
                aiMeters: this.creator?.runtime.meters.filter(m=>m.value>0||m.until>this.creator!.runtime.time).map(m=>({id:`${m.owner}:${m.spec.id}`,label:m.spec.label,icon:m.spec.icon,color:m.spec.color,value:m.value,maximum:m.spec.maximum,remaining:Math.max(0,m.until-this.creator!.runtime.time)})),
            });
        }
        notify(m: string) { sound.play(m.includes('awakens') ? 'boss' : 'reward'); gameAudio.unlock(); this.message = m; this.noticeUntil = this.clock + 4500; this.emit(); }
        drawBossShowcases() {
            this.bossArt.clear();
            const t = this.clock / 1000;
            for (const obj of this.foes.getChildren()) {
                const f = obj as Phaser.Physics.Arcade.Sprite;
                const kind = f.getData('kind') as string;
                if (!f.active || f.getData('creator') || (!f.getData('showcase') && !BOSS_REGISTRY[kind])) continue;
                const def = BOSS_REGISTRY[kind];
                const name = def?.name || ENEMIES[kind]?.name || kind;
                const hp = Math.max(0, Math.ceil(f.getData('hp') || 0));
                const max = Math.max(1, f.getData('maxHp') || hp || 1);
                const hunting = this.clock < (f.getData('memory') || 0) || ['chase', 'hunting', 'windup', 'burst'].includes(f.getData('state')) || f.getData('boss');
                const state = f.getData('dying') ? 'defeated' : hunting ? 'hunting' : (f.getData('state') || 'patrol');
                const color = parseHexColor(def?.phases[0]?.attacks[0]?.telegraphColor, 0xc47a3a);
                const feet = !!f.getData('originFeet');
                const cx = f.x, cy = feet ? f.y - f.displayHeight / 2 : f.y;
                const top = feet ? f.y - f.displayHeight : f.y - f.displayHeight / 2;
                const radX = Math.max(90, f.displayWidth * 0.55);
                const radY = Math.max(58, f.displayHeight * 0.32);
                for (let i = 0; i < 8; i++) {
                    const a = t * 1.35 + i * Math.PI * 2 / 8;
                    const ox = cx + Math.cos(a) * radX, oy = cy + Math.sin(a) * radY;
                    this.bossArt.fillStyle(color, 0.95);
                    this.bossArt.fillRect(ox - 10, oy - 7, 20, 14);
                    this.bossArt.fillStyle(0x5d4037, 0.9);
                    this.bossArt.fillRect(ox - 10, oy - 2, 20, 3);
                }
                this.bossArt.fillStyle(0x112032, 0.92);
                this.bossArt.fillRect(cx - 110, top - 28, 220, 22);
                let label = f.getData('hud') as Phaser.GameObjects.Text | undefined;
                if (!label || !label.active) {
                    label = this.add.text(cx, top - 17, '', { fontFamily: 'monospace', fontSize: '13px', color: '#efffff' }).setOrigin(0.5).setDepth(16);
                    f.setData('hud', label);
                    f.once('destroy', () => { if (label?.active) label.destroy(); });
                }
                label.setPosition(cx, top - 17).setText(`${name} · ${hp}/${max} · ${state}`);
                this.bossArt.fillStyle(0x162333);
                this.bossArt.fillRect(cx - 80, top - 6, 160, 8);
                this.bossArt.fillStyle(0xef7788);
                this.bossArt.fillRect(cx - 80, top - 6, 160 * Math.max(0, Math.min(1, hp / max)), 8);
            }
        }
        async transact(action: Parameters<SaveStore['transact']>[0]) { if(disposed)return false; try {
            const result = await store.transact(action);
            if(disposed)return false;
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
        saberAim() {
            return this.cursor.known
                ? new Phaser.Math.Vector2(this.cursor.x - this.player.x, this.cursor.y - this.player.y).normalize()
                : new Phaser.Math.Vector2(this.facing, 0);
        }
        saberCanCatch(x: number, y: number, incoming?: Phaser.Math.Vector2) {
            if (this.status !== 'playing' || store.world.inventory[this.selected]?.id !== 'lightsaber') return false;
            const swinging = this.clock < this.saberReflectUntil;
            const to = new Phaser.Math.Vector2(x - this.player.x, y - this.player.y);
            const dist = to.length();
            if (dist > (swinging ? 96 : 82)) return false;
            const aim = this.saberAim();
            if (incoming && incoming.lengthSq() > 40)
                return incoming.clone().normalize().dot(aim) < (swinging ? 0.2 : -0.25);
            if (dist < 8) return swinging;
            return to.normalize().dot(aim) > (swinging ? 0.05 : 0.38);
        }
        tryLightsaberDeflectPoint(x: number, y: number, incomingAngle: number) {
            const incoming = new Phaser.Math.Vector2(Math.cos(incomingAngle), Math.sin(incomingAngle));
            if (!this.saberCanCatch(x, y, incoming)) return false;
            this.burst(x, y, 0x69f0ae);
            sound.play('attack');
            gameAudio.weapon('melee');
            return true;
        }
        reflectLightsaberShot(shot: Phaser.Physics.Arcade.Sprite) {
            if (!shot.active || shot.getData('reflected')) return false;
            const body = shot.body as Phaser.Physics.Arcade.Body | undefined;
            const incoming = new Phaser.Math.Vector2(body?.velocity.x ?? 0, body?.velocity.y ?? 0);
            if (!this.saberCanCatch(shot.x, shot.y, incoming)) return false;
            const aim = this.saberAim();
            let dir = incoming.lengthSq() > 80 ? incoming.normalize().scale(-1) : aim.clone();
            let nearest: Phaser.Physics.Arcade.Sprite | undefined;
            let best = 0.12;
            for (const obj of this.foes.getChildren()) {
                const f = obj as Phaser.Physics.Arcade.Sprite;
                if (!f.active || f.getData('dying')) continue;
                const toF = new Phaser.Math.Vector2(f.x - this.player.x, f.y - this.player.y);
                if (toF.length() < 10) continue;
                const aligned = toF.normalize().dot(aim);
                if (aligned > best) { best = aligned; nearest = f; }
            }
            if (nearest) dir = new Phaser.Math.Vector2(nearest.x - shot.x, nearest.y - shot.y).normalize();
            const speed = Math.max(incoming.length(), 320);
            const damage = Math.max(12, shot.getData('damage') || 12);
            const px = shot.x, py = shot.y;
            shot.destroy();
            if (this.shots.countActive() < 48) {
                const bounced = dressProjectile(this.shots.create(px, py, 'shot') as Phaser.Physics.Arcade.Sprite);
                bounced.setTint(0x69f0ae);
                bounced.setVelocity(dir.x * speed, dir.y * speed).setRotation(Math.atan2(dir.y, dir.x));
                bounced.setData({ damage, expires: this.clock + 1800, reflected: true });
            }
            this.burst(px, py, 0x69f0ae);
            sound.play('attack');
            gameAudio.weapon('melee');
            return true;
        }
        pause() { if (this.status === 'dead')
            return; this.status = 'paused'; this.time.paused = true; this.physics.pause(); this.held.clear(); this.fresh.clear(); this.tweens.pauseAll(); this.recallStart = 0; this.emit(); void this.save().catch(() => { }); }
        resume() { sound.unlock(); gameAudio.unlock(); if (this.status === 'dead')
            return; this.status = 'playing'; this.time.paused = false; this.held.clear(); this.fresh.clear(); this.tweens.resumeAll(); this.emit(); }
        async flushSimulation() {
            if (disposed || this.simulationBusy || this.simulationMs <= 0) return;
            const dt = Math.min(1000, this.simulationMs);
            this.simulationMs -= dt; this.simulationBusy = true;
            try {
                const changed = await store.transact((_b, w) => advanceWorld(w, dt));
                if (!disposed) for (const p of changed) this.chunks.invalidate(p.x, p.y);
            } catch { this.simulationMs += dt; }
            finally { this.simulationBusy = false; }
        }
        async save() { if(disposed)return; await this.flushSimulation(); if (this.player && !disposed)
            await store.savePosition(this.player.x, this.player.y, this.selected); }
        recall() { if (this.status !== 'playing')
            return; this.recallStart = this.clock || 1; this.notify('Recalling to the outpost… remain still for 2.5 seconds. Damage cancels recall.'); }
        respawn() {
            this.creator?.runtime.death();
            this.held.clear(); this.fresh.clear(); this.buffer = -1000; this.lastGround = -1000; this.fallPeak = 0; this.fallStartY = 0; this.fallAirSince = 0; this.wasGrounded = true;
            this.jumped = false; this.knockUntil = 0; this.lastAttack = -1000; this.lastMagic = -1000; this.saberReflectUntil = 0;
            this.mining = {key: '', progress: 0}; this.cursor.known = false;
            this.activeEffects = [];
            this.shieldBudget = 0;
            this.spawnGraceUntil = this.clock + (store.world.settings.difficulty === 'extreme' ? 1800 : store.world.settings.difficulty === 'boss' ? 2500 : 6000);
            const stats = derivePlayerStats(store.world, this.activeEffects);
            this.health = stats.maxHealth; this.mana = stats.maxMana;
            store.world.hunger = 100;
            void this.transact((_b, w) => { w.hunger = 100; return ''; });
            this.hurtUntil = this.clock + 2000; this.recallStart = 0;
            this.shots.clear(true, true); this.hostile.clear(true, true); for(const f of [...this.foes.getChildren()])if(!f.getData('creator'))f.destroy(); this.wildlife.group.clear(true, true);
            this.player.setVelocity(0).setAcceleration(0);
            this.player.setPosition(store.world.checkpoint.x, store.world.checkpoint.y);
            this.safe = { ...store.world.checkpoint };
            this.status = 'playing';
            this.time.paused = false;
            this.tweens.resumeAll();
            this.physics.resume();
            this.chunks.ensure(this.player.x, this.player.y);
            this.notify('Returned to the outpost. Inventory, coins, and skins retained.');
        }
        setHealth(n: number) {
            if (this.status === 'dead') return;
            if (!Number.isFinite(n)) return;
            const stats = derivePlayerStats(store.world, this.activeEffects);
            const cap = Math.max(stats.maxHealth, 9999);
            this.health = Math.max(0, Math.min(cap, Math.floor(n)));
            this.hurtUntil = this.clock + 400;
            if (!this.health) {
                this.creator?.runtime.death();
                this.status = 'dead';
                this.held.clear();
                this.physics.pause();
                this.notify('Signal lost. Respawn at the beacon; all possessions are retained.');
            } else
                this.notify(`Health set to ${this.health}/${stats.maxHealth}.`);
            this.emit();
        }
        setMana(n: number) {
            if (this.status === 'dead') return;
            if (!Number.isFinite(n)) return;
            const stats = derivePlayerStats(store.world, this.activeEffects);
            this.mana = Math.max(0, Math.min(stats.maxMana, Math.floor(n)));
            this.notify(`Mana set to ${this.mana}/${stats.maxMana}.`);
            this.emit();
        }
        setHunger(n: number) {
            if (!Number.isFinite(n)) return;
            const value = Math.max(0, Math.min(100, Math.floor(n)));
            store.world.hunger = value;
            this.notify(`Hunger set to ${value}/100.`);
            this.emit();
            void store.transact((_b, w) => { w.hunger = value; }).catch(() => { });
        }
        damage(n: number, x: number, source='enemy-contact') {
            if (this.status !== 'playing' || (source!=='status' && (this.clock < this.hurtUntil || this.nearBase())))
                return;
            const stats = derivePlayerStats(store.world, this.activeEffects);
            let incoming = n;
            if (this.shieldBudget > 0 && this.activeEffects.some(e => e.type === 'defense')) {
                const absorbed = Math.min(this.shieldBudget, incoming * .75);
                this.shieldBudget -= absorbed; incoming -= absorbed;
                if (this.shieldBudget <= 0) this.activeEffects = this.activeEffects.filter(e => e.type !== 'defense');
            }
            if (this.nearWardingTotem) incoming *= 0.7;
            const netDamage = Math.max(1, Math.ceil((incoming - stats.defense) * (store.world.settings.difficulty === 'explorer' ? .7 : store.world.settings.difficulty === 'extreme' ? 1.85 : 1)));
            if(source==='enemy-contact'||source==='enemy-projectile') this.creator?.runtime.buildup(source);
            sound.play('damage');
            this.health = Math.max(0, this.health - netDamage);
            if(source!=='status')this.hurtUntil = this.clock + 1000;
            this.knockUntil = this.clock + 180;
            this.fallPeak = 0;
            this.fallStartY = this.player.y;
            this.fallAirSince = this.clock;
            this.wasGrounded = false;
            const kbMult = Math.max(0.2, 1 - stats.knockbackResistance);
            if(source!=='status')this.player.setAccelerationX(0).setVelocity((this.player.x < x ? -170 : 170) * kbMult, -170 * kbMult);
            if (this.recallStart) {
                this.recallStart = 0;
                this.notify('Recall interrupted by damage.');
            }
            this.burst(this.player.x, this.player.y, 0xff9b98);
            if (this.shake)
                this.cameras.main.shake(100, .003);
            if (!this.health) {
                this.creator?.runtime.death();
                this.status = 'dead';
            analyticsTrack('player_death', biome(store.world.settings, Math.floor(this.player.x / TILE), Math.floor(this.player.y / TILE)), String(Math.floor(this.player.x / TILE)), String(Math.floor(this.player.y / TILE)));
                this.held.clear();
                this.physics.pause();
                this.notify('Signal lost. Respawn at the beacon; all possessions are retained.');
            }
            this.emit();
        }
        hit(f: Phaser.Physics.Arcade.Sprite, damage: number, statusEffect?: string, fromEnemy = false) {
            if(f.getData('creator')) {
                const creatorId = f.getData('creator') as string;
                if(!fromEnemy) this.creator?.runtime.hit(creatorId,damage);
                const actor = this.creator?.runtime.actors.get(creatorId);
                if(f.active)f.setData('hp', actor?.hp);
                if (actor?.defeated) {
                    void this.transact((_b, w) => {
                        const rec = (w.creations ?? []).find(c => c.spec.id === creatorId);
                        if (!rec || rec.defeated) return '';
                        rec.defeated = true;
                        const reward = forgeBossReward(actor.spec.stats.health);
                        w.coins += reward;
                        noteDiscovery(w, 'enemy', creatorId);
                        return `${actor.spec.name} defeated! +${reward} coins. Bound to this world.`;
                    });
                }
                return;
            }
            if (f.getData('dying')) return;
            // Mobs never damage other mobs
            if (fromEnemy && f.getData('team') === 'enemy') return;
            const species = f.getData('species') as string | undefined;
            if (species) {
                f.setData('threat', this.clock + 5000);
                f.setData('hp', f.getData('hp') - damage);
                this.burst(f.x, f.y, 0xb4cfa4);
                if (f.getData('hp') <= 0) {
                    f.setData('dying', true); f.setVelocity(0);
                    void this.transact((_b,w) => {
                        const id = f.getData('id'); if (w.defeated.includes(id)) return '';
                        w.defeated.push(id);
                        for (const drop of ANIMAL_REGISTRY[species].drops) {
                            if (hash(w.settings.seed, f.x, f.y, drop.item) > drop.chance) continue;
                            const n = drop.min;
                            if (!add(w.inventory, drop.item, n)) { w.pendingLoot ??= {}; w.pendingLoot[drop.item] = (w.pendingLoot[drop.item] ?? 0) + n; }
                        }
                        return `Gathered ${ANIMAL_REGISTRY[species].name} resources`;
                    }).then(ok => { if (ok) f.destroy(); else f.setData('dying', false); });
                }
                return;
            }
            const kind = f.getData('kind') as Kind;
            if (store.world.meal?.type === 'damage') damage *= 1 + store.world.meal.magnitude;
            if (kind.includes('rust')) damage *= .8;
            if (kind.includes('crystal') && statusEffect) damage *= .7;
            const vulnerable = kind.startsWith('caster') && f.getData('state') === 'recover';
            if (f.getData('boss')) { damage *= f.getData('state') === 'recover' ? 1.5 : 1; if (statusEffect === 'slowing') statusEffect = undefined; }
            const hp = f.getData('hp') - damage * (vulnerable ? 1.5 : 1);
            f.setData('hp', hp);
            if (statusEffect === 'burning') {
                f.setData('burnUntil', this.clock + 3000);
                f.setTint(0xff5722);
            } else if (statusEffect === 'slowing') {
                f.setData('slowUntil', this.clock + 2500);
                f.setTint(0x40c4ff);
            } else {
                f.setTintFill(0xffffff);
            }
            this.time.delayedCall(90, () => {
                if (f.active && this.clock >= (f.getData('burnUntil') || 0) && this.clock >= (f.getData('slowUntil') || 0))
                    f.clearTint();
            });
            this.burst(f.x, f.y, 0xffb889);
            if (hp <= 0) {
            analyticsTrack('enemy_defeated', kind, store.world.inventory[this.selected]?.id ?? 'unknown', String(this.health));
                f.setData('dying', true);
                f.setVelocity(0);
                const id = f.getData('id') as string;
                const deathKind = kind;
                if (deathKind === 'bomber' || deathKind === 'explosion_bot' || deathKind.includes('volatile')) {
                    // Enemy death blasts only hurt the player — never allies / terrain under packs
                    this.explode(f.x, f.y, { carve: true, source: 'enemy' });
                }
                void this.transact((_b, w) => {
                    if (w.defeated.includes(id)) return '';
                    w.defeated.push(id);
                    w.progress.kills++;
                    noteDiscovery(w, 'enemy', kind);
                    if (f.getData('boss')) {
                        const boss = BOSS_REGISTRY[kind]; w.coins += boss.coinReward;
                        for (const drop of boss.lootTable) if (!add(w.inventory,drop.item,drop.guaranteedCount)) {
                            w.pendingLoot ??= {}; w.pendingLoot[drop.item] = (w.pendingLoot[drop.item] ?? 0) + drop.guaranteedCount;
                        }
                        return `${boss.name} defeated! +${boss.coinReward} coins; first-defeat loot secured. Shrine completed for this world.`;
                    }
                    w.coins += ENEMIES[kind].reward;
                    const resource: ItemId = ENEMIES[kind].drops?.[0]?.item ?? (kind === 'caster' ? 'crystal' : kind === 'hopper' ? 'herb' : 'scrap');
                    const stored = add(w.inventory, resource, 1);
                    if (!stored) {
                        w.pendingLoot ??= {};
                        w.pendingLoot[resource] = (w.pendingLoot[resource] ?? 0) + 1;
                    }
                    return `+${ENEMIES[kind].reward} coins${stored ? ` · ${ITEMS[resource].name}` : ' · Pack full: resource held at the outpost'}`;
                }).then(ok => {
                    if (!f.active) return;
                    if (ok) f.destroy();
                    else {
                        f.setData('dying', false);
                        f.setData('hp', 1);
                    }
                });
            } else {
                f.setVelocityX(f.x < this.player.x ? -100 : 100);
                f.setData('stun', this.clock + 140);
            }
        }
        explodeShot(x: number, y: number, damage: number) {
            this.burst(x, y, 0xba68c8);
            for (let i = 0; i < 8; i++) {
                this.burst(x + (Math.random() - .5) * 40, y + (Math.random() - .5) * 40, 0xe040fb);
            }
            const blastRadius = 75;
            // Player-weapon AoE only — never treat this as friendly fire between mobs
            for (const obj of [...this.foes.getChildren(), ...this.wildlife.group.getChildren()]) {
                const f = obj as Phaser.Physics.Arcade.Sprite;
                if (f.active && !f.getData('dying') && Math.hypot(f.x - x, f.y - y) <= blastRadius) {
                    this.hit(f, damage);
                }
            }
            if (this.shake) this.cameras.main.shake(120, 0.005);
        }
        /**
         * 5-tile radius blast.
         * Enemy-sourced: 60 damage to the player only (no ally damage, optional no carve so packs don't pit each other).
         */
        explode(x: number, y: number, opts?: { carve?: boolean; source?: 'enemy' | 'player' }) {
            const fromEnemy = opts?.source === 'enemy';
            const carve = opts?.carve ?? true;
            this.burst(x, y, 0xff4400);
            this.burst(x, y, 0xffcc66);
            for (let i = 0; i < 12; i++) {
                this.burst(x + (Math.random() - .5) * 5 * TILE, y + (Math.random() - .5) * 5 * TILE, i % 2 ? 0xff6b4a : 0xffc978);
            }
            if (this.shake) this.cameras.main.shake(220, .012);
            if (Math.hypot(this.player.x - x, this.player.y - y) <= 5 * TILE)
                this.damage(60, x);
            if (!fromEnemy) {
                for (const obj of [...this.foes.getChildren(), ...this.wildlife.group.getChildren()]) {
                    const f = obj as Phaser.Physics.Arcade.Sprite;
                    if (f.active && !f.getData('dying') && Math.hypot(f.x - x, f.y - y) <= 5 * TILE)
                        this.hit(f, 40);
                }
            }
            if (!carve) return;
            const ox = Math.floor(x / TILE), oy = Math.floor(y / TILE);
            const cleared: Array<[number, number]> = [];
            void this.transact((_b, w) => {
                for (let dx = -5; dx <= 5; dx++) {
                    for (let dy = -5; dy <= 5; dy++) {
                        if (dx * dx + dy * dy > 25) continue;
                        const tx = ox + dx, ty = oy + dy;
                        if (protectedTile(tx, ty) || inOutpost((tx + .5) * TILE, (ty + .5) * TILE)) continue;
                        try {
                            const current = readTile(w, tx, ty);
                            if (current && current !== 6) {
                                editTile(w, tx, ty, 0);
                                cleared.push([tx, ty]);
                            }
                        } catch { /* beyond world bounds */ }
                    }
                }
                clearUnsupportedHarvest(w, cleared);
                sweepUnsupportedHarvest(w, ox, 2);
                return cleared.length ? 'Explosion carved the terrain' : '';
            }).then(ok => {
                if (!ok || disposed) return;
                const seen = new Set<string>();
                for (const [tx, ty] of cleared) {
                    const key = `${Math.floor(tx / CHUNK)},${Math.floor(ty / CHUNK)}`;
                    if (seen.has(key)) continue;
                    seen.add(key);
                    this.chunks.invalidate(tx, ty);
                }
                for (const [tx, ty] of cleared)
                    this.chunks.refreshDecor(tx, ty);
            });
        }
        detonateExplosionBot(f: Phaser.Physics.Arcade.Sprite) {
            if (f.getData('dying') || !f.active) return;
            f.setData('dying', true);
            const x = f.x, y = f.y;
            const id = f.getData('id') as string;
            f.destroy();
            if (id) void this.transact((_b, w) => {
                if (!w.defeated.includes(id)) w.defeated.push(id);
                return '';
            });
            this.explode(x, y, { carve: true, source: 'enemy' });
            this.notify('Explosion bot detonated!');
        }
        castBlink() {
            if (this.status !== 'playing') return;
            const fromX = this.player.x, fromY = this.player.y;
            const aim = this.cursor.known
                ? new Phaser.Math.Vector2(this.cursor.x - fromX, this.cursor.y - fromY)
                : new Phaser.Math.Vector2(this.facing, 0);
            const dist = Math.min(130, Math.max(40, aim.length() || 120));
            const dir = aim.normalize();
            const destX = fromX + dir.x * dist;
            const destY = fromY + dir.y * dist;
            const blocked = !this.chunks.ready(destX, destY) || !clearLine(store.world, fromX, fromY, destX, destY)
                || [-10, 10].some(dx => [-20, 0, 22].some(dy => solid(store.world, Math.floor((destX + dx) / TILE), Math.floor((destY + dy) / TILE))));

            if (blocked) {
                this.notify('Blink obstructed: cannot teleport into solid terrain.');
                return;
            }

            this.burst(fromX, fromY, 0x9b59b6);
            this.player.setPosition(destX, destY);
            this.safe = { x: destX, y: destY };
            this.burst(destX, destY, 0x00e5ff);
            const seg = destX - fromX, sey = destY - fromY, len2 = seg * seg + sey * sey || 1;
            let struck = 0;
            for (const obj of this.foes.getChildren()) {
                const f = obj as Phaser.Physics.Arcade.Sprite;
                if (!f.active || f.getData('dying')) continue;
                const t = Math.max(0, Math.min(1, ((f.x - fromX) * seg + (f.y - fromY) * sey) / len2));
                if (Math.hypot(f.x - (fromX + seg * t), f.y - (fromY + sey * t)) > 40) continue;
                this.hit(f, 5);
                struck++;
            }
            if (struck) this.notify(`Blink · 5 damage × ${struck}`);
            this.emit();
        }
        castShield() {
            if (this.status !== 'playing' || this.clock - this.lastShield < 12000) return;
            if (this.mana < 30) {
                this.notify('Low mana. Shield requires 30 mana.');
                return;
            }
            this.mana -= 30;
            this.lastShield = this.clock;
            this.lastMagic = this.clock;
            this.addEffect('defense', 10000, 10);
            this.shieldBudget = 40;
            this.burst(this.player.x, this.player.y, 0x3498db);
            this.notify('✦ Hardened Aegis active (10s, up to 40 damage absorbed)!');
            this.emit();
        }
        attack() {
            const item = store.world.inventory[this.selected]?.id;
            if (!item) return;
            const stats = derivePlayerStats(store.world, this.activeEffects);

            if (FOOD_PROFILES[item]) {
                if (!this.busy && this.clock - this.lastAttack >= 600) {
                    this.busy = true; this.lastAttack = this.clock;
                    void this.transact((_b, w) => eatFood(w, item).message).then(ok => {
                        if (ok && !disposed) this.health = Math.min(derivePlayerStats(store.world).maxHealth, this.health + FOOD_PROFILES[item].healthRestore);
                        this.busy = false;
                    });
                }
                return;
            }
            if (item === 'tonic') {
                if (this.health >= stats.maxHealth) {
                    this.notify('Health is already full.');
                    return;
                }
                if (!this.busy) {
                    this.busy = true;
                    void this.transact((_b, w) => {
                        if (!remove(w.inventory, 'tonic', 1)) throw new Error('No field tonic.');
                        return 'Restored 40 health';
                    }).then(ok => {
                        if (disposed) return;
                        if (ok) this.health = Math.min(stats.maxHealth, this.health + 40);
                        this.busy = false;
                    });
                }
                return;
            }

            if (item === 'potion_mana') {
                if (this.mana >= stats.maxMana) {
                    this.notify('Mana is already full.');
                    return;
                }
                if (!this.busy) {
                    this.busy = true;
                    void this.transact((_b, w) => {
                        if (!remove(w.inventory, 'potion_mana', 1)) throw new Error('No mana draught.');
                        return 'Restored 50 mana';
                    }).then(ok => {
                        if (disposed) return;
                        if (ok) this.mana = Math.min(stats.maxMana, this.mana + 50);
                        this.busy = false;
                    });
                }
                return;
            }

            if (item === 'vitality_core') {
                if (!this.busy) {
                    this.busy = true;
                    void this.transact((_b, w) => useVitalityCore(w)).then(ok => {
                        if (disposed) return;
                        if (ok) {
                            const st = derivePlayerStats(store.world, this.activeEffects);
                            this.health = Math.min(st.maxHealth, this.health + 10);
                            this.burst(this.player.x, this.player.y, 0x2ecc71);
                        }
                        this.busy = false;
                    });
                }
                return;
            }

            if (item === 'mana_core') {
                if (!this.busy) {
                    this.busy = true;
                    void this.transact((_b, w) => useManaCore(w)).then(ok => {
                        if (disposed) return;
                        if (ok) {
                            const st = derivePlayerStats(store.world, this.activeEffects);
                            this.mana = Math.min(st.maxMana, this.mana + 10);
                            this.burst(this.player.x, this.player.y, 0x9b59b6);
                        }
                        this.busy = false;
                    });
                }
                return;
            }

            if (!(item in WEAPONS)) return;
            const weapon = WEAPONS[item as keyof typeof WEAPONS];
            if (this.clock - this.lastAttack < weapon.cooldown) return;
            if (this.mana < weapon.mana) {
                sound.play('ui');
                this.lastAttack = this.clock;
                this.notify('Low mana. Let your energy recharge.');
                return;
            }
            const spendsAmmo = item !== 'lightsaber';
            if (spendsAmmo && count(store.world.inventory, 'ammo') < 1) {
                sound.play('ui');
                this.lastAttack = this.clock;
                this.notify('No ammo. Loot chests or buy ammo at the outpost.');
                return;
            }
            if (weapon.type !== 'melee' && this.shots.countActive() >= 35) return;

            const cue = weapon.type === 'melee' ? 'melee' : weapon.type === 'magic' ? 'magic' : 'ranged';
            sound.play('attack'); gameAudio.weapon(cue);
            this.lastAttack = this.clock;
            this.mana -= weapon.mana;
            if (weapon.mana) this.lastMagic = this.clock;
            if (spendsAmmo) void this.transact((_b, w) => { remove(w.inventory, 'ammo', 1); return ''; });

            const aim = this.cursor.known ? new Phaser.Math.Vector2(this.cursor.x - this.player.x, this.cursor.y - this.player.y).normalize() : new Phaser.Math.Vector2(this.facing, 0);
            const ang = Math.atan2(aim.y, aim.x);

            // Melee weapons — hit in the mouse/aim direction
            if (weapon.type === 'melee' || ['sword', 'sword_long', 'spear', 'hammer_heavy', 'lightsaber'].includes(item)) {
                const reach = weapon.range || 72;
                if (item === 'spear') {
                    const spearG = this.add.graphics().setDepth(12);
                    spearG.lineStyle(4, 0x64b5f6, 0.95);
                    spearG.lineBetween(this.player.x, this.player.y, this.player.x + aim.x * reach, this.player.y + aim.y * reach);
                    spearG.fillStyle(0xe1f5fe, 1);
                    spearG.fillTriangle(
                        this.player.x + aim.x * reach, this.player.y + aim.y * reach,
                        this.player.x + aim.x * (reach - 14) - aim.y * 6, this.player.y + aim.y * (reach - 14) + aim.x * 6,
                        this.player.x + aim.x * (reach - 14) + aim.y * 6, this.player.y + aim.y * (reach - 14) - aim.x * 6
                    );
                    this.tweens.add({ targets: spearG, alpha: 0, duration: 150, onComplete: () => spearG.destroy() });
                } else if (item === 'hammer_heavy') {
                    const slamX = this.player.x + aim.x * 35;
                    const slamY = this.player.y + aim.y * 35;
                    const slamG = this.add.graphics().setDepth(12);
                    slamG.lineStyle(4, 0xffb74d, 0.9);
                    slamG.strokeCircle(slamX, slamY, 45);
                    slamG.fillStyle(0xffd54f, 0.35);
                    slamG.fillCircle(slamX, slamY, 45);
                    this.tweens.add({ targets: slamG, alpha: 0, scaleX: 1.3, scaleY: 1.3, duration: 200, onComplete: () => slamG.destroy() });
                    if (this.shake) this.cameras.main.shake(120, 0.005);
                } else {
                    const isLong = item === 'sword_long' || item === 'lightsaber';
                    const arcRadius = item === 'lightsaber' ? 78 : isLong ? 82 : 62;
                    const arcColor = item === 'lightsaber' ? 0x69f0ae : isLong ? 0x69f0ae : 0xb4fff0;
                    const arc = this.add.graphics().setDepth(12);
                    arc.lineStyle(item === 'lightsaber' ? 7 : isLong ? 6 : 5, arcColor, 0.95);
                    arc.beginPath();
                    arc.arc(this.player.x, this.player.y, arcRadius, ang - 1.05, ang + 1.05);
                    arc.strokePath();
                    this.tweens.add({ targets: arc, alpha: 0, duration: 180, onComplete: () => arc.destroy() });
                }
                for (const obj of [...this.foes.getChildren(), ...this.wildlife.group.getChildren()]) {
                    const f = obj as Phaser.Physics.Arcade.Sprite;
                    const toFoe = new Phaser.Math.Vector2(f.x - this.player.x, f.y - this.player.y);
                    const dist = toFoe.length();
                    const aligned = dist < 8 || toFoe.normalize().dot(aim) > 0.25;
                    const extra = isBossLike(f) ? Math.max(f.displayWidth, f.displayHeight) * 0.55 : 0;
                    const inReach = dist <= reach + 18 + extra;
                    if (aligned && inReach && clearLine(store.world, this.player.x, this.player.y, f.x, f.y)) {
                        this.hit(f, weapon.damage);
                        if (item === 'hammer_heavy') f.setVelocity(Math.sign(f.x - this.player.x) * (weapon.knockback || 260), -200);
                    }
                }
                if (item === 'lightsaber') {
                    this.saberReflectUntil = this.clock + 280;
                    for (const obj of [...this.hostile.getChildren()])
                        this.reflectLightsaberShot(obj as Phaser.Physics.Arcade.Sprite);
                }
                return;
            }

            // Projectile weapons (Guns and Magic)
            const originX = this.player.x + aim.x * 26, originY = this.player.y + aim.y * 26;
            if (!clearLine(store.world, this.player.x, this.player.y, originX, originY))
                return;

            const isMagic = weapon.type === 'magic' || ['staff', 'staff_ember', 'wand_frost', 'staff_arc', 'tome_crystal'].includes(item);
            const textureKey = isMagic ? 'magic' : 'shot';

            // Shotgun / Scatter (5 pellets)
            if (item === 'blaster_scatter') {
                const spreads = [-0.28, -0.14, 0, 0.14, 0.28];
                for (const spr of spreads) {
                    const shot = dressProjectile(this.shots.create(originX, originY, textureKey) as Phaser.Physics.Arcade.Sprite);
                    shot.setTint(0xffb74d);
                    const v = aim.clone().rotate(spr).scale(weapon.speed);
                    shot.setVelocity(v.x, v.y).setRotation(v.angle());
                    shot.setData({ damage: weapon.damage, expires: this.clock + 450 });
                }
                this.burst(originX, originY, 0xffb74d);
                return;
            }

            // Burst blaster (3 pellets in rapid succession)
            if (item === 'blaster_burst') {
                const spreads = [-0.08, 0, 0.08];
                for (let i = 0; i < spreads.length; i++) {
                    this.time.delayedCall(i * 55, () => {
                        if (disposed || !this.player || this.status !== 'playing' || this.shots.countActive() >= 48) return;
                        const shot = dressProjectile(this.shots.create(this.player.x + aim.x * 26, this.player.y + aim.y * 26, textureKey) as Phaser.Physics.Arcade.Sprite);
                        if (!shot) return;
                        shot.setTint(0x80deea);
                        const v = aim.clone().rotate(spreads[i]).scale(weapon.speed);
                        shot.setVelocity(v.x, v.y).setRotation(v.angle());
                        shot.setData({ damage: weapon.damage, expires: this.clock + 1300 });
                        this.burst(shot.x, shot.y, 0x80deea);
                    });
                }
                return;
            }

            // Rail rifle (high speed piercing beam)
            if (item === 'rifle_rail') {
                const shot = dressProjectile(this.shots.create(originX, originY, textureKey) as Phaser.Physics.Arcade.Sprite);
                shot.setTint(0x00e5ff);
                shot.setScale(1.5, 1.2);
                shot.setVelocity(aim.x * weapon.speed, aim.y * weapon.speed).setRotation(aim.angle());
                shot.setData({ damage: weapon.damage, pierce: weapon.pierce ?? 3, hitFoes: new Set<string>(), expires: this.clock + 1400 });
                this.burst(originX, originY, 0x00e5ff);
                return;
            }

            // Other weapons: single projectile with custom tints & effects
            const shot = dressProjectile(this.shots.create(originX, originY, textureKey) as Phaser.Physics.Arcade.Sprite);
            shot.setVelocity(aim.x * weapon.speed, aim.y * weapon.speed).setRotation(aim.angle());
            const shotData: Record<string, any> = { damage: weapon.damage, expires: this.clock + 1500 };

            let burstColor = 0x9dffdf;
            if (item === 'staff') {
                shot.setTint(0xc2a3ff);
                burstColor = 0xc2a3ff;
            } else if (item === 'staff_ember') {
                shot.setTint(0xff5722);
                shotData.statusEffect = 'burning';
                burstColor = 0xff5722;
            } else if (item === 'wand_frost') {
                shot.setTint(0x40c4ff);
                shotData.statusEffect = 'slowing';
                burstColor = 0x40c4ff;
            } else if (item === 'staff_arc') {
                shot.setTint(0x18ffff);
                shotData.chain = true;
                shotData.hitFoes = new Set<string>();
                burstColor = 0x18ffff;
            } else if (item === 'tome_crystal') {
                shot.setTint(0xba68c8);
                shotData.isExplosive = true;
                burstColor = 0xba68c8;
            } else if (item === 'carbine') {
                shot.setTint(0xffdd80);
                burstColor = 0xffdd80;
            }

            shot.setData(shotData);
            this.burst(originX, originY, burstColor);
        }
        targetTile() { return { x: Math.floor((this.cursor.known ? this.cursor.x : this.player.x + this.facing * 32) / TILE), y: Math.floor((this.cursor.known ? this.cursor.y : this.player.y + 32) / TILE) }; }
        inReach(x: number, y: number, reachTiles = 5.2) {
            return Math.hypot((x + .5) * TILE - this.player.x, (y + .5) * TILE - this.player.y) <= TILE * reachTiles && clearLine(store.world, this.player.x, this.player.y, (x + .5) * TILE, (y + .5) * TILE, true);
        }
        mine(delta: number) {
            const item = store.world.inventory[this.selected]?.id;
            const tool = item ? getToolProfile(item) : undefined;
            if (!tool && !['pickaxe', 'drill'].includes(item ?? ''))
                return;
            if (tool?.specialBonus === 'mobility') {
                const {x,y}=this.targetTile();
                if(this.inReach(x,y,tool.reachTiles) && solid(store.world,x,y)) {
                    const aim=new Phaser.Math.Vector2((x+.5)*TILE-this.player.x,(y+.5)*TILE-this.player.y);
                    if(aim.length()>45) { aim.normalize().scale(320);this.player.setVelocity(aim.x,aim.y); }
                    this.target.lineStyle(2,0xc6d6df);this.target.lineBetween(this.player.x,this.player.y,(x+.5)*TILE,(y+.5)*TILE);
                }
                return;
            }
            const reach = tool?.reachTiles ?? 5.2;
            const { x, y } = this.targetTile(), key = `${x},${y}`, foreground = readTile(store.world,x,y), m = foreground || store.world.backgroundWalls?.[key] || 0;
            if (!this.inReach(x, y, reach) || !m || m === 6 || protectedTile(x, y)) {
                this.mining.progress = 0;
                return;
            }
            const matProfile = MATERIALS[m];
            const minTier = matProfile.minTier ?? 0;
            const toolTier = tool?.tier ?? (item === 'drill' ? 2 : 0);
            if (toolTier < minTier) {
                this.target.fillStyle(0xe74c3c, 0.85);
                this.target.fillRect(x * TILE, y * TILE - 5, TILE, 3);
                this.mining.progress = 0;
                if (this.mining.key !== key) {
                    this.mining.key = key;
                    this.notify(`Requires Tier ${minTier} tool to mine ${matProfile.name}!`);
                }
                return;
            }
            if (this.mining.key !== key)
                this.mining = { key, progress: 0 };
            let speedMult = tool?.mineSpeedMultiplier ?? (item === 'drill' ? 2 : 1);
            const stats = derivePlayerStats(store.world, this.activeEffects);
            speedMult *= stats.mineSpeedMultiplier;
            if (this.nearProspectorTotem) {
                speedMult *= 1.35;
            }
            if (tool?.specialBonus === 'demolition' && [7, 17, 18, 19, 20].includes(m)) {
                speedMult *= 2.5;
            } else if (tool?.specialBonus === 'woodcutting' && [17, 18, 20].includes(m)) {
                speedMult *= 2.5;
            }
            this.mining.progress += delta * speedMult;
            this.target.fillStyle(0xf1e0b0, .8);
            this.target.fillRect(x * TILE, y * TILE - 5, TILE * Math.min(1, this.mining.progress / matProfile.time), 3);
            if (this.mining.progress >= matProfile.time && !this.busy) {
                this.busy = true;
                this.mining.progress = 0;
                void this.transact((_b, w) => {
                    if ((readTile(w, x, y) || w.backgroundWalls?.[key] || 0) !== m)
                        return '';
                    if (m === 20 && w.containers?.[key]?.some(Boolean)) throw new Error('Empty the storage crate before removing it.');
                    if (m === 20) delete w.containers?.[key];
                    delete w.crops?.[key];
                    const drop = matProfile.drop;
                    if (drop && !add(w.inventory, drop, 1))
                        throw new Error('Inventory full. The block was not mined.');
                    if (!foreground && w.backgroundWalls?.[key]) delete w.backgroundWalls[key]; else editTile(w, x, y, 0); analyticsTrack('block_mined', MATERIALS[m].name, drop ?? '', biome(store.world.settings, x, Math.floor(this.player.y / TILE)));
                    if (m === 24 || m === 25) {
                        for (const dy of [-1, 1]) {
                            const n = readTile(w, x, y + dy);
                            if (n === 24 || n === 25) editTile(w, x, y + dy, 0);
                        }
                    }
                    clearUnsupportedHarvest(w, [[x, y]]);
                    sweepUnsupportedHarvest(w, x, 1);
                    if (drop === 'stone')
                        w.progress.stone++;
                    markOnboarding(w, 'mined');
                    const discovered = drop ? noteDiscovery(w, 'item', drop) : '';
                    return `+1 ${drop ? ITEMS[drop].name : 'resource'}${discovered ? ` · ${discovered}` : ''}`;
                }).then(ok => {
                    if (disposed) return;
                    if (ok) {
                        sound.play('mine'); gameAudio.mine(m);
                        this.chunks.invalidate(x, y);
                        this.chunks.invalidate(x, y - 1);
                        this.chunks.invalidate(x, y + 1);
                        this.chunks.refreshDecor(x, y);
                        this.burst((x + .5) * TILE, (y + .5) * TILE, matProfile.color);
                    }
                    this.busy = false;
                });
            }
        }
        place() {
            const item = store.world.inventory[this.selected]?.id;
            if (!item || BUILDING[item] === undefined) {
                this.notify('Select soil, stone, bricks, platforms, walls, crates, doors, ropes, ladders, or torches to place.');
                return;
            }
            const material = BUILDING[item]!, { x, y } = this.targetTile();
            const rect = new Phaser.Geom.Rectangle(x * TILE, y * TILE, TILE, TILE);
            const isSolidMat = MATERIALS[material].solid;
            const background=MATERIALS[material].isBackground;
            const occupied = isSolidMat && (Phaser.Geom.Intersects.RectangleToRectangle(rect, this.player.getBounds()) || this.foes.getChildren().some(f => Phaser.Geom.Intersects.RectangleToRectangle(rect, (f as Phaser.Physics.Arcade.Sprite).getBounds())));
            const reach = 5.5;
            const standX = Math.floor(this.player.x / TILE);
            const standY = Math.floor(((this.player.body as Phaser.Physics.Arcade.Body).bottom - 1) / TILE);
            const adjacent = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
                const neighbor = readTile(store.world, x + dx, y + dy);
                return solid(store.world, x + dx, y + dy) || neighbor !== 0;
            }) || (Math.abs(x - standX) + Math.abs(y - standY) === 1) || (Math.abs(x - standX) <= 1 && y === standY + 1);
            if (this.busy || !this.inReach(x, y, reach) || (background ? !!store.world.backgroundWalls?.[`${x},${y}`] : readTile(store.world, x, y) !== 0) || occupied || protectedTile(x, y) || !adjacent) {
                this.notify('Place beside an existing block or structure, within reach, away from actors and outpost.');
                return;
            }
            if (material === 30 && (![1, 9].includes(readTile(store.world, x, y + 1)) || Object.keys(store.world.crops ?? {}).length >= 128)) {
                this.notify('Plant on soil or turf; maximum 128 growing crops.'); return;
            }
            if (material === 24 && readTile(store.world, x, y - 1) !== 0) {
                this.notify('Doors need two empty tiles of height.');
                return;
            }
            this.busy = true;
            void this.transact((_b, w) => {
                if ((background ? !!w.backgroundWalls?.[`${x},${y}`] : readTile(w, x, y) !== 0) || !remove(w.inventory, item, 1))
                    throw new Error('Placement unavailable.');
                if (material === 24 && readTile(w, x, y - 1) !== 0) throw new Error('Doors need two empty tiles of height.');
                if(background) { w.backgroundWalls ??= {}; w.backgroundWalls[`${x},${y}`]=material as 18|19; } else editTile(w, x, y, material);
                if (material === 30) { w.crops ??= {}; w.crops[`${x},${y}`] = { plantedAt: w.elapsedMs ?? 0 }; }
                if (material === 24) editTile(w, x, y - 1, 24);
                return `Placed ${ITEMS[item].name}`;
            }).then(ok => {
                if (disposed) return;
                if (ok) {
                    this.chunks.invalidate(x, y);
                    if (material === 24) this.chunks.invalidate(x, y - 1);
                }
                this.busy = false;
            });
        }

        findHarvestable(): Harvest | null {
            const w = store.world, cx = Math.floor(this.player.x / (TILE * CHUNK));
            let best: Harvest | null = null, bestDist = 75;
            for (const dx of [-1, 0, 1]) {
                for (const p of harvestables(w.settings, cx + dx)) {
                    if (w.harvested.includes(p.id)) continue;
                    if (!solid(w, p.x, p.y)) continue;
                    const dist = Math.hypot(p.x * TILE - this.player.x, p.y * TILE - 20 - this.player.y);
                    if (dist < bestDist && clearLine(w, this.player.x, this.player.y, p.x * TILE, p.y * TILE - 15)) {
                        best = p; bestDist = dist;
                    }
                }
            }
            return best;
        }
        gather(delta: number) {
            if (this.busy || this.status !== 'playing') return;
            const p = this.findHarvestable();
            if (!p) {
                this.gathering = { id: '', progress: 0, kind: 'herb' };
                return;
            }
            if (this.gathering.id !== p.id) this.gathering = { id: p.id, progress: 0, kind: p.kind };
            let speed = 1;
            const held = store.world.inventory[this.selected]?.id;
            if (p.kind === 'tree' && held === 'axe_wood') speed = 1.6;
            else if (p.kind === 'tree' && held === 'hammer_construction') speed = 1.2;
            this.gathering.progress += delta * speed;
            const need = HARVEST_MS[p.kind];
            // Progress bar above the plant
            const bx = p.x * TILE, by = p.y * TILE - 28;
            this.target.fillStyle(0x0a1620, 0.85);
            this.target.fillRect(bx, by, TILE, 5);
            this.target.fillStyle(p.kind === 'tree' ? 0x8bc34a : p.kind === 'herb' ? 0x66bb6a : 0xd4a574, 1);
            this.target.fillRect(bx, by, TILE * Math.min(1, this.gathering.progress / need), 5);
            if (this.clock % 220 < 40) { sound.play('mine'); gameAudio.mine(p.kind === 'tree' ? 1 : 5); }
            if (this.gathering.progress < need) return;
            this.busy = true;
            this.gathering = { id: '', progress: 0, kind: p.kind };
            void this.transact((_b, world) => {
                if (world.harvested.includes(p.id)) return '';
                const id: ItemId = p.kind === 'tree' ? 'wood' : p.kind === 'herb' ? 'herb' : 'scrap';
                const quantity = p.kind === 'tree' ? (world.inventory[this.selected]?.id === 'axe_wood' ? 12 : 8) : 3;
                if (!add(world.inventory, id, quantity)) throw new Error('Inventory full. Gather this later.');
                if (p.kind === 'herb' && (!add(world.inventory, 'berries', 3) || !add(world.inventory, 'seeds_crop', 1) || !add(world.inventory, 'mushroom_edible', 2)))
                    throw new Error('Make room for forage.');
                world.harvested.push(p.id);
                return `+${quantity} ${ITEMS[id].name}`;
            }).then(ok => {
                if (disposed) return;
                if (ok) {
                    sound.play('reward');
                    this.chunks.refreshDecor(p.x, p.y - 1);
                }
                this.busy = false;
            });
        }

        interact() {
            const w = store.world, cx = Math.floor(this.player.x / (TILE * CHUNK));
            if (w.generator >= 2) for (const site of bossSites(w.settings)) {
                if (Math.hypot(site.x*TILE-this.player.x,(site.floor-1)*TILE-this.player.y)<(w.settings.difficulty==='boss'?170:85)) {
                    if (w.defeated.includes(`boss:${site.id}`)) { this.notify('Shrine completed. Each regional boss grants rewards once per world.'); return; }
                    if (this.foes.getChildren().some(o=>(o as Phaser.Physics.Arcade.Sprite).getData('boss'))) return;
                    this.foes.clear(true,true); this.hostile.clear(true,true);
                    const flying = site.id==='aether_warden';
                    this.createEnemy(site.id,site.x*TILE,site.floor*TILE-(flying?7:4)*TILE,`boss:${site.id}`);
                    const boss=this.foes.getChildren().at(-1) as Phaser.Physics.Arcade.Sprite;
                    if (!boss) return;
                    boss.setData({boss:true,state:'recover',until:this.clock+2500,cycle:0,arenaX:site.x*TILE});
                    if(flying) (boss.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
                    this.placeFoeOpen(boss, flying);
                    this.notify(`${BOSS_REGISTRY[site.id].name} awakens! Dodge the amber telegraphs; strike during recovery.`);
                    return;
                }
            }
            const ptx = Math.floor(this.player.x / TILE), pty = Math.floor(this.player.y / TILE);
            for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                    const nx = ptx + dx, ny = pty + dy;
                    const m = readTile(w, nx, ny);
                    if(m>=32 && m<=35) { this.pause();onMenu(m===34 ? 'cooking' : 'crafting');return; }
                    if (m === 31 && !this.busy) {
                        this.busy = true;
                        void this.transact((_b, world) => harvestCrop(world, nx, ny)).then(ok => {
                            if (ok && !disposed) this.chunks.invalidate(nx, ny); this.busy = false;
                        }); return;
                    }
                    if (m === 24) {
                        if (!this.busy) {
                            this.busy = true;
                            void this.transact((_b, world) => {
                                editTile(world, nx, ny, 25);
                                if (readTile(world, nx, ny - 1) === 24) editTile(world, nx, ny - 1, 25);
                                if (readTile(world, nx, ny + 1) === 24) editTile(world, nx, ny + 1, 25);
                                return 'Opened timber door';
                            }).then(ok => {
                                if (disposed) return;
                                if (ok) { this.chunks.invalidate(nx, ny); this.chunks.invalidate(nx, ny - 1); this.chunks.invalidate(nx, ny + 1); }
                                this.busy = false;
                            });
                        }
                        return;
                    }
                    if (m === 25) {
                        const door = new Phaser.Geom.Rectangle(nx * TILE, (ny - 1) * TILE, TILE, TILE * 2);
                        if (Phaser.Geom.Intersects.RectangleToRectangle(door, this.player.getBounds()) || this.foes.getChildren().some(f => Phaser.Geom.Intersects.RectangleToRectangle(door, (f as Phaser.Physics.Arcade.Sprite).getBounds()))) { this.notify('Doorway occupied.'); return; }
                        if (!this.busy) {
                            this.busy = true;
                            void this.transact((_b, world) => {
                                editTile(world, nx, ny, 24);
                                if (readTile(world, nx, ny - 1) === 25) editTile(world, nx, ny - 1, 24);
                                if (readTile(world, nx, ny + 1) === 25) editTile(world, nx, ny + 1, 24);
                                return 'Closed timber door';
                            }).then(ok => {
                                if (disposed) return;
                                if (ok) { this.chunks.invalidate(nx, ny); this.chunks.invalidate(nx, ny - 1); this.chunks.invalidate(nx, ny + 1); }
                                this.busy = false;
                            });
                        }
                        return;
                    }
                    if (m === 20) {
                        this.storageKey = `${nx},${ny}`;
                        this.pause();
                        onMenu('storage');
                        return;
                    }
                }
            }
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
                // Trees / plants / scrap: hold E — see gather()

            }
            if (this.nearBase()) {
                this.pause();
                const px = this.player.x;
                if (Math.abs(px - 25 * TILE) < 55) onMenu('shop');
                else if (Math.abs(px - 20 * TILE) < 50) onMenu('cooking');
                else onMenu('crafting');
                return;
            }
            this.notify('Press E beside a door, crate, tree, herb, salvage pile, chest, or outpost station.');
        }
        spawn() {
            const diff = store.world.settings.difficulty;
            const extreme = diff === 'extreme';
            const bossMode = diff === 'boss';
            if (!bossMode && this.foes.getChildren().some(o => (o as Phaser.Physics.Arcade.Sprite).getData('boss'))) return;
            const cap = extreme ? 140 : bossMode ? 4 : diff === 'explorer' ? 6 : 22;
            if (this.clock < this.spawnGraceUntil || this.foes.countActive() >= cap)
                return;
            const w = store.world, cam = this.cameras.main.worldView;
            let spawned = 0;
            const maxSpawn = extreme ? 36 : bossMode ? 1 : diff === 'explorer' ? 2 : 6;
            const allVariantIds = Object.keys(BIOME_VARIANTS);
            for (const key of this.chunks.active.keys()) {
                if (spawned >= maxSpawn || this.foes.countActive() >= cap) break;
                const [cx, cy] = key.split(',').map(Number);
                const inCave = cy > 0;
                const slots = extreme
                    ? (inCave ? 16 : 12)
                    : bossMode ? 1
                    : diff === 'explorer' ? 1
                    : (inCave ? 4 : 3);
                for (let slot = 0; slot < slots; slot++) {
                    if (spawned >= maxSpawn || this.foes.countActive() >= cap) break;
                    const id = `enemy:${key}:${slot}`;
                    if (w.defeated.includes(id) || this.foes.getChildren().some(f => (f as Phaser.Physics.Arcade.Sprite).getData('id') === id))
                        continue;
                    if (bossMode && inCave) continue;
                    const tx = cx * CHUNK + 3 + Math.floor(hash(w.settings.seed, cx, cy, `enemy-${slot}`) * 26);
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
                    const wantFly = extreme
                        ? hash(w.settings.seed, tx, ty, `fly-${slot}`) > (inCave ? 0.22 : 0.32)
                        : bossMode ? hash(w.settings.seed, tx, ty, `fly-${slot}`) > 0.45
                        : diff === 'standard'
                            ? hash(w.settings.seed, tx, ty, `fly-${slot}`) > (inCave ? 0.4 : 0.62)
                            : inCave && hash(w.settings.seed, tx, ty, `fly-${slot}`) > 0.55;
                    let x = (tx + .5) * TILE, y = (ty + 1) * TILE - 23;
                    if (wantFly) {
                        y = (ty + 1) * TILE - 23 - (24 + Math.floor(hash(w.settings.seed, tx, ty, `hover-${slot}`) * 90));
                        if (solid(w, tx, Math.floor(y / TILE)) || solid(w, tx, Math.floor(y / TILE) - 1))
                            continue;
                    } else if (solid(w, tx, ty) || solid(w, tx, ty - 1) || !solid(w, tx, ty + 1))
                        continue;
                    const camPad = extreme ? 40 : 100;
                    if (inOutpost(x, y, 80)
                        || Phaser.Geom.Rectangle.Contains(Phaser.Geom.Rectangle.Clone(cam).setSize(cam.width + camPad, cam.height + camPad), x, y)
                        || Math.hypot(x - this.player.x, y - this.player.y) > (extreme ? 2200 : 1600))
                        continue;
                    const b = biome(w.settings, tx, ty);
                    const flyShooters = ['dart_wisp', 'sky_gunner', 'razorwing', 'wisp', 'skimmer', 'drone'] as Kind[];
                    let roster: Kind[];
                    if (bossMode) {
                        roster = Object.keys(BOSS_REGISTRY) as Kind[];
                    } else if (extreme) {
                        roster = inCave
                            ? ['drone', 'wisp', 'skimmer', 'dart_wisp', 'sky_gunner', 'razorwing', 'caster', 'bomber', 'explosion_bot', 'gunner', 'sentinel', 'crawler', 'brute', 'spitter', 'grub', 'hopper', ...allVariantIds]
                            : ['crawler', 'hopper', 'bomber', 'explosion_bot', 'brute', 'stalker', 'spitter', 'dart_wisp', 'sky_gunner', 'razorwing', 'drone', 'wisp', 'skimmer', 'gunner', 'caster', ...allVariantIds];
                    } else if (inCave || b === 'Crystal depths') {
                        roster = diff === 'standard'
                            ? ['caster', 'sentinel', 'drone', 'bomber', 'gunner', 'crawler', 'spitter', 'wisp', 'skimmer', 'dart_wisp', 'sky_gunner']
                            : ['caster', 'drone', 'crawler', 'wisp'];
                    } else if (b === 'Rust wastes') {
                        roster = diff === 'standard'
                            ? ['crawler', 'gunner', 'brute', 'rockmite', 'drone', 'bomber', 'hopper', 'sky_gunner', 'skimmer']
                            : ['crawler', 'gunner', 'hopper'];
                    } else {
                        const variants = allVariantIds.filter(id => BIOME_VARIANTS[id].biomeAffinity === b);
                        roster = diff === 'standard'
                            ? (variants.length ? [...variants, 'hopper', 'stalker', 'spitter', 'dart_wisp', 'sky_gunner', 'crawler'] : ['crawler', 'hopper', 'stalker', 'spitter', 'dart_wisp', 'wisp', 'gunner'])
                            : (variants.length ? [...variants, 'crawler', 'hopper'] : ['crawler', 'hopper', 'drone']);
                    }
                    if (wantFly) roster = roster.filter(k => FLYING.has(k) || ENEMIES[k]?.flying || ENEMIES[k]?.baseClass === 'BaseFlyingEnemy' || ENEMIES[k]?.baseClass === 'BaseFlyingBoss' || (ENEMIES[k]?.baseType === 'drone'));
                    if (!roster.length) roster = flyShooters;
                    const kind = roster[Math.floor(hash(w.settings.seed, tx, ty, `roster-${slot}`) * roster.length)]!;
                    this.createEnemy(kind, x, y, id);
                    if (bossMode) {
                        const just = (this.foes.getChildren() as Phaser.Physics.Arcade.Sprite[]).find(f => f.getData('id') === id);
                        if (just) {
                            just.setData('showcase', true);
                            just.setData('eliteDamage', 2.25);
                            const def = BOSS_REGISTRY[kind];
                            if (def) {
                                just.setData('hp', Math.ceil(def.maxHp * 1.2));
                                just.setData('maxHp', Math.ceil(def.maxHp * 1.2));
                            }
                            const flying = FLYING.has(kind) || !!ENEMIES[kind]?.flying || ENEMIES[kind]?.baseClass === 'BaseFlyingBoss';
                            this.placeFoeOpen(just, flying);
                        }
                    }
                    // Extreme: chance to stamp an elite affix for even nastier packs
                    if (extreme && hash(w.settings.seed, tx, ty, `elite-${slot}`) > 0.72) {
                        const foes = this.foes.getChildren() as Phaser.Physics.Arcade.Sprite[];
                        const just = foes.find(f => f.getData('id') === id);
                        if (just) {
                            const eliteKeys = Object.keys(ELITE_MODIFIERS);
                            const elite = ELITE_MODIFIERS[eliteKeys[Math.floor(hash(w.settings.seed, tx, ty, `affix-${slot}`) * eliteKeys.length)]!]!;
                            just.setData('hp', Math.ceil((just.getData('hp') as number) * elite.hpMultiplier));
                            just.setData('maxHp', just.getData('hp'));
                            just.setData('eliteDamage', elite.damageMultiplier);
                            just.setTint(Number.parseInt(elite.colorTint.slice(1), 16));
                            just.setScale((just.scaleX || 1) * (elite.specialTrait === 'defense' ? 1.15 : 1.05));
                        }
                    }
                    spawned++;
                }
            }
        }
        createEnemy(kind:Kind,x:number,y:number,id:string){
            if (inOutpost(x, y, 24)) return;
            try {
            const stats=ENEMIES[kind] || ENEMIES.sentinel;
            const texKey = this.textures.exists(kind) ? kind : this.textures.exists(stats.texture) ? stats.texture : (this.textures.exists('sentinel') ? 'sentinel' : stats.texture || kind);
            const f=this.foes.create(x,y,texKey) as Phaser.Physics.Arcade.Sprite;
            f.setDepth(8);
            const baseType = stats.baseType || kind;
            const showcase = !!BOSS_REGISTRY[kind];
            if (!showcase && stats.scale) f.setScale(stats.scale);
            if (!showcase) {
            if (stats.collider) {
                f.setSize(stats.collider.width, stats.collider.height);
                if (stats.collider.offsetX !== undefined && stats.collider.offsetY !== undefined) {
                    f.setOffset(stats.collider.offsetX, stats.collider.offsetY);
                }
            } else if (stats.hitbox) {
                f.setSize(stats.hitbox.width, stats.hitbox.height);
            } else {
                f.setSize(baseType==='sentinel'?32:24,baseType==='drone'?24:32);
            }
            }
            const logicController = stats.logicController || (baseType === 'drone' ? 'HoverAndStrafe' : baseType === 'sentinel' ? 'AggressiveBoss' : 'PatrolAndAttack');
            f.setData({
                id,
                kind,
                team: 'enemy',
                baseType,
                baseClass: stats.baseClass,
                logicController,
                attackPattern: stats.attackPattern || (showcase ? { type: 'ProjectileBurst', burstCount: 4, projectileColor: BOSS_REGISTRY[kind]?.phases[0]?.attacks[0]?.telegraphColor || '#ffb74d' } : undefined),
                hp: stats.hp,
                maxHp: stats.hp,
                homeX: x,
                homeY: y,
                state: showcase ? 'hunting' : 'patrol',
                until: this.clock + 1000,
                dir: -1,
                memory: 0,
                lastSeen: x,
                stun: 0,
                showcase,
                nextThink: this.clock + hash(store.world.settings.seed, x, y, 'ai-phase') * 100
            });
            const body = f.body as Phaser.Physics.Arcade.Body;
            if (body) {
                if (stats.mass) body.setMass(stats.mass);
                if (baseType === 'drone' || stats.baseClass === 'BaseFlyingEnemy' || stats.baseClass === 'BaseFlyingBoss' || logicController === 'HoverAndStrafe' || FLYING.has(kind) || stats.flying) {
                    body.setAllowGravity(false);
                }
            }
            if (showcase) {
                this.dressBoss(f, kind, stats);
                const flying = FLYING.has(kind) || !!stats.flying || stats.baseClass === 'BaseFlyingBoss';
                this.placeFoeOpen(f, flying);
            }
            } catch { /* skip a bad spawn rather than halt the session */ }
        }
        restoreWorldCreations() {
            for (const saved of store.world.creations ?? []) {
                if (saved.defeated) continue;
                const onPlayer = Math.hypot(saved.x - this.player.x, saved.y - this.player.y) < 520 || inOutpost(saved.x, saved.y, 100);
                const at = onPlayer
                    ? { x: this.player.x + (this.player.x >= OUTPOST_X ? 920 : -920), y: this.player.y - 40 }
                    : { x: saved.x, y: saved.y };
                try { this.applyCreation(saved.spec, at, false); }
                catch { /* placement may be blocked after terrain edits; spec remains on the world */ }
            }
        }
        persistCreation(id: string) {
            const actor = this.creator?.runtime.actors.get(id);
            if (!actor) return;
            void this.transact((_b, w) => {
                w.creations = [...(w.creations ?? []).filter(c => c.spec.id !== id), {
                    spec: actor.spec, x: actor.x, y: actor.y, defeated: actor.defeated,
                }];
                noteDiscovery(w, 'enemy', id);
            });
        }
        applyCreation(spec: CreationSpec, at?: { x: number; y: number }, persist = true) {
            this.creator ??= new CreatorRenderer(this,this.foes,()=>this.player,(p,r)=>{
                for(let x=p.x-r;x<=p.x+r;x+=TILE/2) for(let y=p.y-r;y<=p.y+r;y+=TILE/2) {
                    const tx=Math.floor(x/TILE),ty=Math.floor(y/TILE);
                    if(Math.abs(tx)>=WORLD_LIMIT-2||ty<1||ty>=DEPTH-2||solid(store.world,tx,ty)||inOutpost(x,y,420))return false;
                }return true;
            },(n,x,source)=>{const before=this.health;this.damage(n,x,source);return this.health<before&&this.status==='playing';},
            (p,angle)=>this.tryLightsaberDeflectPoint(p.x,p.y,angle));
            const result=this.creator.apply(spec, at);
            const spawned=(this.foes.getChildren() as Phaser.Physics.Arcade.Sprite[]).find(f=>f.getData('creator')===result.id);
            if (spawned) this.placeFoeOpen(spawned, spec.movement.mode==='hover');
            if (persist) this.persistCreation(result.id);
            this.emit();return result;
        }
        bossAI(f: Phaser.Physics.Arcade.Sprite) {
            const id=f.getData('kind') as string, def=BOSS_REGISTRY[id];
            const phase=f.getData('hp') / f.getData('maxHp') < .5 ? 1 : 0;
            const config=def.phases[phase], until=f.getData('until') as number;
            if(Math.abs(this.player.x-f.getData('arenaX'))>700 || this.status==='dead') { f.destroy(); this.hostile.clear(true,true); return; }
            const state=f.getData('state');
            if(state==='windup') {
                f.setTint(0xffc275);f.setVelocityX(0);
                if (store.world.settings.difficulty !== 'boss') {
                    this.target.lineStyle(3,0xffc275,.8);
                    this.target.lineBetween(f.x,f.y,f.getData('aimX'),f.getData('aimY'));
                }
                if(this.clock<until)return;
                const cycle=f.getData('cycle') as number;
                if(id==='rust_colossus' && cycle%2===0) {
                    f.setVelocityX(Math.sign(f.getData('aimX')-f.x)*(phase?280:210));
                    f.setData({state:'charge',until:this.clock+650});return;
                }
                const n=id==='aether_warden' ? (phase?7:5) : id==='mycelial_sovereign' ? (phase?5:3) : 3;
                const angle=Math.atan2(f.getData('aimY')-f.y,f.getData('aimX')-f.x);
                for(let i=0;i<n && this.hostile.countActive()<32;i++) {
                    const shot=this.hostile.create(f.x,f.y,'magic') as Phaser.Physics.Arcade.Sprite;
                    const a=angle+(i-(n-1)/2)*.24;
                    shot.setVelocity(Math.cos(a)*155,Math.sin(a)*155).setTint(id==='mycelial_sovereign'?0xacc580:0xb69cff);
                    shot.setData({damage:phase?20:14,expires:this.clock+2600});
                }
                if(id==='mycelial_sovereign' && cycle%3===0 && this.foes.countActive()<4) {
                    this.createEnemy('crawler_fungal',f.x-65,f.y,`summon:${this.clock}`);
                }
                f.setData({state:'recover',until:this.clock+config.attackIntervalMs}); f.clearTint();return;
            }
            if(state==='charge') { if(this.clock<until)return; f.setVelocityX(0); f.setData({state:'recover',until:this.clock+1200}); return; }
            f.setVelocityX(0).setTint(0x9affdc);
            if(this.clock<until)return;
            f.setData({state:'windup',until:this.clock+Math.max(650,config.telegraphDurationMs),aimX:this.player.x,aimY:this.player.y,cycle:(f.getData('cycle')??0)+1});
        }
        ai() {
            for (const obj of this.foes.getChildren()) {
                if(obj.getData('creator'))continue;
                const f = obj as Phaser.Physics.Arcade.Sprite,
                      kind = f.getData('kind') as Kind,
                      p = ENEMIES[kind] || ENEMIES.sentinel,
                      baseType = (f.getData('baseType') as string) || kind,
                      logicController = (f.getData('logicController') as string) || (baseType === 'drone' ? 'HoverAndStrafe' : baseType === 'sentinel' ? 'AggressiveBoss' : 'PatrolAndAttack'),
                      body = f.body as Phaser.Physics.Arcade.Body,
                      dx = this.player.x - f.x,
                      dy = this.player.y - f.y,
                      dist = Math.hypot(dx, dy),
                      home = f.getData('homeX') as number;
                if (dist > 1800 || !this.chunks.has(Math.floor(f.x / (CHUNK * TILE)), Math.floor(f.y / (CHUNK * TILE)))) {
                    f.destroy();
                    continue;
                }
                if (f.getData('dying')) continue;
                if (inOutpost(f.x, f.y, 16) || this.nearBase()) {
                    f.setData('memory', 0);
                    const dir = f.x >= OUTPOST_X ? 1 : -1;
                    if (inOutpost(f.x, f.y, 16)) {
                        if (Math.abs(f.x - OUTPOST_X) < 220) f.x = OUTPOST_X + dir * 360;
                        f.setVelocityX(dir * Math.max(p.speed, 90) * 1.5);
                    } else f.setVelocityX(Math.sign(home - f.x) * p.speed);
                    f.setFlipX(dir > 0);
                    continue;
                }
                const flyingFoe = FLYING.has(kind) || !!p.flying || p.baseClass === 'BaseFlyingBoss' || p.baseClass === 'BaseFlyingEnemy' || logicController === 'HoverAndStrafe' || baseType === 'drone';
                if (f.getData('showcase') || f.getData('boss') || BOSS_REGISTRY[kind]) {
                    const box = f.body as Phaser.Physics.Arcade.Body | undefined;
                    const hw = (box?.width ?? 28) / 2, hh = (box?.height ?? 32) / 2;
                    const stuck = [[0, -hh + 4], [0, hh - 4], [-hw + 4, 0], [hw - 4, 0], [0, 0]].some(([dx, dy]) =>
                        solid(store.world, Math.floor((f.x + dx) / TILE), Math.floor((f.y + dy) / TILE)));
                    if (stuck) this.placeFoeOpen(f, flyingFoe);
                }
                if (f.getData('boss')) { this.bossAI(f); continue; }
                if (this.clock < f.getData('nextThink')) continue;
                f.setData('nextThink', this.clock + 100);
                if (f.getData('dying') || this.clock < f.getData('stun'))
                    continue;
                if (this.clock < (f.getData('burnUntil') || 0)) {
                    const lastBurnTick = f.getData('lastBurnTick') || 0;
                    if (this.clock - lastBurnTick >= 500) {
                        f.setData('lastBurnTick', this.clock);
                        const curHp = f.getData('hp') - 6;
                        f.setData('hp', curHp);
                        this.burst(f.x, f.y, 0xff5722);
                        if (curHp <= 0) {
                            this.hit(f, 0);
                            continue;
                        }
                    }
                }
                const isSlowed = this.clock < (f.getData('slowUntil') || 0);
                const foeSpeedMult = isSlowed ? 0.55 : 1.0;
                const scale = (f.getData('showScale') as number) || p.scale || 1;
                const dmg = Math.ceil(p.damage * ((f.getData('eliteDamage') as number) || 1));
                // Explosion bot: rush the player; fuse on contact, blast still 5 tiles (player only)
                if (kind === 'explosion_bot') {
                    if (this.nearBase()) {
                        f.setVelocityX(Math.sign(home - f.x) * p.speed);
                        f.clearTint();
                        continue;
                    }
                    // Fuse only when nearly touching the player so packed extreme swarms don't mass-detonate together
                    if (dist <= 1.35 * TILE) {
                        this.detonateExplosionBot(f);
                        continue;
                    }
                    const dir = Math.sign(dx) || 1;
                    f.setVelocityX(dir * p.speed * 1.35 * foeSpeedMult);
                    if ((body.blocked.left || body.blocked.right) && (body.blocked.down || body.touching.down))
                        f.setVelocityY(-MOVEMENT.jump);
                    f.setFlipX(dir > 0);
                    f.setTint(dist <= 5 * TILE ? 0xffab40 : 0xff6b4a);
                    continue;
                }
                const sight = dist < p.range && !this.nearBase() && clearLine(store.world, f.x, f.y, this.player.x, this.player.y);
                if (sight) {
                    f.setData('memory', this.clock + 1500);
                    f.setData('lastSeen', this.player.x);
                }
                const maxPursuit = (logicController === 'AggressiveBoss') ? 800 : 340;
                const pursuit = Math.abs(f.x - home) < maxPursuit;
                let direction = Math.sign((sight && pursuit ? this.player.x : this.clock < f.getData('memory') && pursuit ? f.getData('lastSeen') : home) - f.x) || 1;
                let state = f.getData('state') as string;
                const until = f.getData('until') as number;
                if (this.clock < (f.getData('burnUntil') || 0)) f.setTint(0xff5722);
                else if (isSlowed) f.setTint(0x40c4ff);
                else f.clearTint();
                f.setScale(scale);
                if (state === 'windup') {
                    f.setVelocityX(0);
                    f.setTint(0xffbc77);
                    f.setScale(scale * 1.08, scale * .93);
                    if (this.clock < until)
                        continue;

                    const pattern = (f.getData('attackPattern') as any) || p.attackPattern;
                    let behavior = pattern?.type || (baseType === 'hopper' ? 'hop' : (baseType === 'sentinel' || logicController === 'AggressiveBoss') ? 'Dash' : (baseType === 'gunner' || logicController === 'StationaryTurret') ? 'ProjectileBurst' : 'MeleeSwipe');

                    if (Array.isArray(pattern?.modularBehaviors) && pattern.modularBehaviors.length > 0) {
                        const behaviors = pattern.modularBehaviors;
                        if (dist < 90 && behaviors.includes('MeleeSwipe')) {
                            behavior = 'MeleeSwipe';
                        } else if (dist > 200 && behaviors.includes('Dash')) {
                            behavior = 'Dash';
                        } else if (dist > 150 && behaviors.includes('ProjectileBurst')) {
                            behavior = 'ProjectileBurst';
                        } else if (behaviors.includes('AreaOfEffectHazard') && Math.random() < 0.35) {
                            behavior = 'AreaOfEffectHazard';
                        } else if (behaviors.includes('SummonMinion') && this.foes.countActive() < 18 && Math.random() < 0.3) {
                            behavior = 'SummonMinion';
                        } else {
                            const cycle = (f.getData('behaviorIndex') || 0) % behaviors.length;
                            behavior = behaviors[cycle];
                            f.setData('behaviorIndex', cycle + 1);
                        }
                    }

                    if (behavior === 'hop' || (baseType === 'hopper' && !pattern)) {
                        const landingX = Math.floor((f.x + direction * 85) / TILE);
                        const landingY = Math.floor(body.bottom / TILE);
                        const safeLanding = [0,1,2,3].some(dy => solid(store.world,landingX,landingY+dy) && !solid(store.world,landingX,landingY+dy-1));
                        f.setVelocity(safeLanding ? direction * 160 : 0, -MOVEMENT.jump);
                        state = 'recover';
                        f.setData('until', this.clock + 1100);
                    }
                    else if (behavior === 'Dash' || behavior === 'charge') {
                        f.setVelocityX(direction * Math.max(240, p.speed * 2.6));
                        if (dy < -40 && (body.blocked.down || body.touching.down)) {
                            f.setVelocityY(-MOVEMENT.jump);
                        }
                        state = 'charge';
                        f.setData('until', this.clock + 460);
                    }
                    else if (behavior === 'MeleeSwipe' || behavior === 'melee') {
                        f.setVelocityX(direction * Math.max(140, p.speed * 1.5));
                        f.setTint(0xff4444);
                        if (dist < 95) {
                            this.damage(dmg, f.x);
                        }
                        state = 'recover';
                        f.setData('until', this.clock + (pattern?.interval ? Math.min(pattern.interval, 1200) : 900));
                    }
                    else if (behavior === 'SummonMinion') {
                        if (this.foes.countActive() < 24) {
                            const minionKind = (baseType === 'drone' ? 'drone' : 'crawler') as Kind;
                            this.createEnemy(minionKind, f.x + direction * 44, f.y - 12, `minion-${Date.now()}-${Math.floor(Math.random() * 1000)}`);
                            this.notify(`✦ ${p.name || 'Entity'} summoned reinforcements!`);
                        }
                        state = 'recover';
                        f.setData('until', this.clock + 1400);
                    }
                    else if (behavior === 'AreaOfEffectHazard') {
                        const aoeColor = pattern?.projectileColor ? parseInt(pattern.projectileColor.replace('#', '0x'), 16) : 0xff5555;
                        for (let i = 0; i < 8; i++) {
                            const angle = (i / 8) * Math.PI * 2;
                            if (this.hostile.countActive() < 32) {
                                const shot = this.hostile.create(f.x, f.y, 'magic') as Phaser.Physics.Arcade.Sprite;
                                if (shot) {
                                    shot.setTint(aoeColor);
                                    shot.setVelocity(Math.cos(angle) * 160, Math.sin(angle) * 160);
                                    shot.setData({ damage: Math.round(dmg * 0.8), expires: this.clock + 2200 });
                                }
                            }
                        }
                        if (this.shake) this.cameras.main.shake(180, 0.008);
                        state = 'recover';
                        f.setData('until', this.clock + 1200);
                    }
                    else if (behavior === 'ProjectileBurst' || behavior === 'burst') {
                        const burstCount = pattern?.burstCount ? Math.max(2, Math.min(8, pattern.burstCount)) : 3;
                        const projColor = pattern?.projectileColor ? parseInt(pattern.projectileColor.replace('#', '0x'), 16) : 0xff847a;
                        if (sight && this.hostile.countActive() < 24) {
                            const shot = this.hostile.create(f.x, f.y, 'hostile') as Phaser.Physics.Arcade.Sprite;
                            shot.setTint(projColor);
                            const v = new Phaser.Math.Vector2(dx, dy).normalize().scale(230);
                            shot.setVelocity(v.x, v.y);
                            shot.setData({ damage: dmg, expires: this.clock + 2400 });
                        }
                        state = 'burst';
                        f.setData('remaining', burstCount - 1);
                        f.setData('burstColor', projColor);
                        f.setData('until', this.clock + 180);
                    }
                    else {
                        const projColor = pattern?.projectileColor ? parseInt(pattern.projectileColor.replace('#', '0x'), 16) : 0xff847a;
                        if (sight && this.hostile.countActive() < 24) {
                            const shot = this.hostile.create(f.x, f.y, baseType === 'caster' ? 'magic' : 'hostile') as Phaser.Physics.Arcade.Sprite;
                            shot.setTint(projColor);
                            const v = new Phaser.Math.Vector2(dx, dy).normalize().scale(baseType === 'caster' ? 145 : 220);
                            shot.setVelocity(v.x, v.y);
                            shot.setData({ damage: dmg, expires: this.clock + 2400 });
                        }
                        state = (baseType === 'gunner' || logicController === 'StationaryTurret') ? 'burst' : 'recover';
                        f.setData('remaining', 2);
                        f.setData('until', this.clock + (baseType === 'gunner' || logicController === 'StationaryTurret' ? 180 : baseType === 'caster' ? 1600 : 1100));
                    }
                    f.setData('state', state);
                    continue;
                }
                if (state === 'burst') {
                    f.setVelocityX(0);
                    if (this.clock >= until) {
                        const projColor = (f.getData('burstColor') as number) || 0xff847a;
                        if (sight && this.hostile.countActive() < 24) {
                            const shot = this.hostile.create(f.x, f.y, 'hostile') as Phaser.Physics.Arcade.Sprite;
                            shot.setTint(projColor);
                            const spread = (Math.random() - 0.5) * 0.25;
                            const v = new Phaser.Math.Vector2(dx, dy).normalize().rotate(spread).scale(230);
                            shot.setVelocity(v.x, v.y);
                            shot.setData({ damage: dmg, expires: this.clock + 2400 });
                        }
                        const remaining = Number(f.getData('remaining')) - 1;
                        f.setData({ remaining, state: remaining > 0 ? 'burst' : 'recover', until: this.clock + (remaining > 0 ? 180 : 1300) });
                    }
                    continue;
                }
                if (state === 'charge') {
                    if (this.clock < until && !body.blocked.left && !body.blocked.right && solid(store.world, Math.floor((f.x + Math.sign(body.velocity.x) * 32) / TILE), Math.floor((body.bottom + 8) / TILE)))
                        continue;
                    state = 'recover';
                    f.setData('until', this.clock + 1500);
                    f.setVelocityX(0);
                    f.setData('state', state);
                    continue;
                }
                if (state === 'recover' && this.clock < until) {
                    if (baseType === 'drone' || logicController === 'HoverAndStrafe' || FLYING.has(kind) || p.flying)
                        f.setVelocityX(-direction * 60);
                    else if (baseType !== 'hopper')
                        f.setVelocityX(0);
                    continue;
                }
                const pattern = (f.getData('attackPattern') as any) || p.attackPattern;
                if (sight && pursuit && (pattern || baseType !== 'crawler' || logicController === 'AggressiveBoss') && this.clock >= until) {
                    const triggerRange = pattern?.range || p.range || (pattern?.type === 'MeleeSwipe' ? 100 : 320);
                    if (dist <= triggerRange ||
                        baseType === 'hopper' ||
                        ((baseType === 'sentinel' || logicController === 'AggressiveBoss') && dist < 220) ||
                        baseType === 'caster' && dist < 350 ||
                        baseType === 'gunner' && dist < 370 ||
                        (baseType === 'drone' || logicController === 'HoverAndStrafe' || FLYING.has(kind) || p.flying) && dist < 300 ||
                        logicController === 'StationaryTurret' && dist < p.range) {
                        const windupTime = pattern?.warningTimeMs || (baseType === 'sentinel' || logicController === 'AggressiveBoss' ? 650 : baseType === 'caster' ? 850 : 500);
                        f.setData({ state: 'windup', until: this.clock + windupTime });
                        continue;
                    }
                }
                state = sight && pursuit ? 'chase' : this.clock < f.getData('memory') && pursuit ? 'investigate' : Math.abs(f.x - home) > 100 ? 'return' : 'patrol';
                f.setData('state', state);
                if (sight && (baseType === 'caster' || baseType === 'gunner') && dist < 160)
                    direction = -Math.sign(dx);
                if (state === 'patrol') {
                    direction = f.getData('dir');
                    if (Math.abs(f.x - home) > 100)
                        direction = Math.sign(home - f.x);
                }
                if (logicController === 'StationaryTurret') {
                    f.setVelocity(0, 0);
                    direction = Math.sign(dx) || 1;
                } else if (baseType === 'drone' || logicController === 'HoverAndStrafe' || FLYING.has(kind) || p.flying) {
                    const hover = kind === 'wisp' ? 70 : kind === 'skimmer' ? 55 : 45;
                    const targetY = sight && pursuit ? this.player.y - hover : f.getData('homeY') - hover;
                    let vx = direction * p.speed * foeSpeedMult, vy = Phaser.Math.Clamp((targetY - f.y) * 1.5, -75, 75);
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
                        if ((body.blocked.down || body.touching.down))
                            f.setVelocityY(-MOVEMENT.jump);
                        else
                            direction = -direction;
                    }
                    if (!floor) {
                        direction = -direction;
                        f.setData('memory', 0);
                    }
                    f.setData('dir', direction);
                    f.setVelocityX(direction * p.speed * foeSpeedMult);
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
            const color = b === 'Rust wastes' ? 0x42333c
                : b === 'Frost highlands' ? 0x24384a
                : b === 'Fungal hollows' ? 0x201530
                : b === 'Crystal depths' ? 0x171c35
                : b === 'Ashen depths' ? 0x260a0a
                : 0x193a48;
            this.sky.fillStyle(color);
            this.sky.fillRect(0, 0, 960, 540);
            this.stars.clear();
            this.stars.fillStyle(b === 'Rust wastes' ? 0x765547 : b === 'Ashen depths' ? 0x5a1818 : b === 'Frost highlands' ? 0x3d5a6b : 0x2d5261, .5);
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
                const sources = [{ x: this.player.x - cam.scrollX, y: this.player.y - cam.scrollY, r: 220 }];
                for (let x = tx - 23; x <= tx + 23; x++)
                    for (let y = ty - 13; y <= ty + 13; y++) {
                        const material = readTile(store.world, x, y);
                        if (material === 8 || material === 39 || (material === 4 && hash(store.world.settings.seed, x, y, 'glow') > .9) || material === 23)
                            sources.push({ x: (x + .5) * TILE - cam.scrollX, y: (y + .5) * TILE - cam.scrollY, r: material === 8 || material === 39 ? 145 : material === 23 ? 120 : 65 });
                    }
                for (let x = 0; x < 960; x += 32)
                    for (let y = 0; y < 540; y += 32) {
                        let alpha = .38;
                        for (const light of sources)
                            alpha = Math.min(alpha, Math.max(0, Math.hypot(x + 16 - light.x, y + 16 - light.y) / light.r - .45) * .38);
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
                this.chunks.ensure(this.player.x, this.player.y);
                this.chunks.step();
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
            delta = Math.min(delta, 50);
            this.clock += delta;
            this.creator?.runtime.tick(delta);
            this.creator?.draw();
            this.shotsVsBosses();
            this.drawBossShowcases();
            this.simulationMs += delta;
            if (this.simulationMs >= 1000) void this.flushSimulation();
            if (this.status === 'playing' && (store.world.hunger ?? 100) <= 0) {
                this.health = 0;
                this.status = 'dead';
                this.held.clear();
                this.physics.pause();
                this.notify('Starved. Respawn at the beacon; all possessions are retained.');
                this.emit();
                return;
            }
            const m = MOVEMENT, b = this.player.body as Phaser.Physics.Arcade.Body;
            let grounded = b.blocked.down || b.touching.down;

            // Fall damage from drop distance (large falls only; normal jumps safe on explorer/standard)
            if (!grounded) {
                if (this.wasGrounded) {
                    this.fallStartY = this.player.y;
                    this.fallAirSince = this.clock;
                    this.fallPeak = 0;
                }
                if (b.velocity.y > this.fallPeak) this.fallPeak = b.velocity.y;
            } else if (!this.wasGrounded) {
                const drop = this.player.y - this.fallStartY;
                const airMs = this.clock - this.fallAirSince;
                const minDrop = 3.2 * TILE;
                const minPeak = 520;
                if (drop > minDrop && this.fallPeak > minPeak && airMs > 280 && this.clock >= this.hurtUntil && !this.nearBase()) {
                    const amount = Math.min(72, Math.max(12, Math.floor((drop - minDrop) / (TILE * 0.28)) + 12));
                    this.health = Math.max(0, this.health - amount);
                    this.hurtUntil = this.clock + 1400;
                    this.burst(this.player.x, this.player.y + 18, 0xffb889);
                    this.notify(this.health ? `Hard landing (−${amount}).` : 'Signal lost. Respawn at the beacon; all possessions are retained.');
                    if (!this.health) {
                this.creator?.runtime.death();
                        this.status = 'dead';
                        this.held.clear();
                        this.physics.pause();
                    }
                    this.emit();
                }
                this.fallPeak = 0;
            }
            this.wasGrounded = grounded;

            // One-way platform drop-through command (Down / S + Space)
            if ((this.held.has('KeyS') || this.held.has('ArrowDown')) && (this.fresh.has('Space') || this.held.has('Space'))) {
                this.dropThroughUntil = this.clock + 280;
                this.player.setVelocityY(120);
            }
            // One-way platform landing from above
            if (this.clock > this.dropThroughUntil && b.velocity.y >= 0) {
                const footY = this.player.y + 25;
                const footTy = Math.floor(footY / TILE);
                const leftTx = Math.floor((this.player.x - 9) / TILE);
                const rightTx = Math.floor((this.player.x + 9) / TILE);
                const platLeft = MATERIALS[readTile(store.world, leftTx, footTy)]?.isPlatform;
                const platRight = MATERIALS[readTile(store.world, rightTx, footTy)]?.isPlatform;
                if (platLeft || platRight) {
                    const platTop = footTy * TILE;
                    if (footY >= platTop - 2 && footY <= platTop + 9) {
                        this.player.y = platTop - 25;
                        this.player.setVelocityY(0);
                        b.blocked.down = true;
                        grounded = true;
                    }
                }
            }

            // Climbable ropes and ladders
            const ptx = Math.floor(this.player.x / TILE);
            const pty = Math.floor((this.player.y + 8) / TILE);
            const centerMat = readTile(store.world, ptx, pty);
            const isClimbing = MATERIALS[centerMat]?.isClimbable;
            if (isClimbing) {
                if (this.held.has('KeyW') || this.held.has('ArrowUp')) {
                    this.player.setVelocityY(-160);
                    this.lastGround = this.clock;
                    this.jumped = false;
                } else if (this.held.has('KeyS') || this.held.has('ArrowDown')) {
                    this.player.setVelocityY(160);
                } else if (!grounded && b.velocity.y > 40) {
                    this.player.setVelocityY(40);
                }
            }

            // Lava hazard contact check
            const minTx = Math.floor((this.player.x - 10) / TILE);
            const maxTx = Math.floor((this.player.x + 10) / TILE);
            const minTy = Math.floor((this.player.y - 20) / TILE);
            const maxTy = Math.floor((this.player.y + 24) / TILE);
            let inLava = false;
            for (let lx = minTx; lx <= maxTx; lx++) {
                for (let ly = minTy; ly <= maxTy; ly++) {
                    if (readTile(store.world, lx, ly) === 23) {
                        inLava = true;
                        break;
                    }
                }
                if (inLava) break;
            }
            if (inLava) {
                if (this.clock - this.lastLavaDamage >= 500) {
                    this.lastLavaDamage = this.clock;
                    this.burningUntil = this.clock + 2500;
                    this.addEffect('burning', 2500, 2);
                    this.damage(12, this.player.x);
                    this.burst(this.player.x, this.player.y + 10, 0xff5722);
                    this.notify('Warning: Burning in lava hazard!');
                }
            }
            if (this.clock < this.burningUntil && Math.floor(this.clock / 160) % 2 === 0) {
                this.burst(this.player.x + (Math.random() - .5) * 16, this.player.y + (Math.random() - .5) * 20, 0xff7043);
            }

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
            // Totem proximity is sampled at 5 Hz, bounded to 441 nearby tiles.
            if (this.clock - this.lastTotemScan >= 200) {
            this.lastTotemScan = this.clock;
            const totemTx = Math.floor(this.player.x / TILE);
            const totemTy = Math.floor(this.player.y / TILE);
            let nearVitality = false;
            let nearWarding = false;
            let nearProspector = false;
            let nearArcane = false;

            for (let dy = -10; dy <= 10; dy++) {
                for (let dx = -10; dx <= 10; dx++) {
                    const mat = readTile(store.world, totemTx + dx, totemTy + dy);
                    if (mat >= 26 && mat <= 29) {
                        const dist = Math.hypot(dx, dy);
                        if (mat === 26 && dist <= 8) nearVitality = true;
                        if (mat === 27 && dist <= 8) nearWarding = true;
                        if (mat === 28 && dist <= 10) nearProspector = true;
                        if (mat === 29 && dist <= 8) nearArcane = true;
                    }
                }
            }
            this.nearVitalityTotem = nearVitality;
            this.nearWardingTotem = nearWarding;
            this.nearProspectorTotem = nearProspector;
            this.nearArcaneTotem = nearArcane;
            }
            const nearVitality=this.nearVitalityTotem, nearArcane=this.nearArcaneTotem;

            const stats = derivePlayerStats(store.world, this.activeEffects);
            const meal = store.world.meal;
            const regen = (store.world.hunger ?? 100) >= 80 ? .3 : 0;
            {
                const healAmt = (regen + (meal?.type === 'regen' ? meal.magnitude : 0)) * delta / 1000;
                if (healAmt > 0) this.health = Math.min(Math.max(this.health, stats.maxHealth), this.health + healAmt);
            }

            if (nearVitality && this.health < stats.maxHealth) {
                this.health = Math.min(stats.maxHealth, this.health + 3 * (delta / 1000));
            } // leave over-max (/set) health alone when already above cap
            if (nearArcane && this.mana < stats.maxMana) {
                this.mana = Math.min(stats.maxMana, this.mana + 10 * (delta / 1000));
            }

            // Tick active status effects on player
            const { remainingEffects, hpDelta } = tickStatusEffects(this.activeEffects, delta);
            this.activeEffects = remainingEffects;
            if (hpDelta < 0) {
                this.health = Math.max(0, this.health + hpDelta);
                if (this.health <= 0) {
                    this.health = 0;
                    this.status = 'dead';
                    this.physics.pause();
                    this.notify('Signal lost. Respawn at the beacon; all possessions are retained.');
                    this.emit();
                }
            } else if (hpDelta > 0) {
                this.health = Math.min(Math.max(this.health, stats.maxHealth), this.health + hpDelta);
            }

            const totalSpeedMult = stats.speedMultiplier;
            b.setMaxVelocity(m.speed * totalSpeedMult, m.maxFall);
            const direction = Number(this.held.has('KeyD') || this.held.has('ArrowRight')) - Number(this.held.has('KeyA') || this.held.has('ArrowLeft'));
            if (this.clock >= this.knockUntil) {
                this.player.setAccelerationX(direction * m.acceleration * totalSpeedMult).setDragX(direction ? 0 : m.deceleration);
            }
            if (direction) {
                this.facing = direction;
                if (this.recallStart) {
                    this.recallStart = 0;
                    this.notify('Recall cancelled by movement.');
                }
            }
            this.player.setFlipX(this.facing < 0);
            const bodyNow = this.player.body as Phaser.Physics.Arcade.Body;
            if (direction && (bodyNow.blocked.down || bodyNow.touching.down) && Math.abs(bodyNow.velocity.x) > 20) {
                sound.play('walk'); gameAudio.walk();
            }
            const hurt = this.clock < this.hurtUntil;
            this.player.setAlpha(hurt && Math.floor(this.clock / 80) % 2 ? .45 : 1);
            this.player.setTexture(`${store.data.profile.equipped}-${hurt ? 'hurt' : !grounded ? b.velocity.y < 0 ? 'air' : 'fall' : direction ? `run${Math.floor(this.clock / 100) % 2}` : 'idle'}`);
            // Four visual layers follow the original player pose; physics body stays unchanged.
            this.outfit.clear().setPosition(this.player.x, this.player.y).setScale(this.facing, 1).setAlpha(this.player.alpha);
            const parts = store.data.profile.outfit ?? {};
            const stride = grounded && direction ? Math.sin(this.clock / 100) * 3 : !grounded ? -2 : 0;
            for (const slot of ['legs', 'torso', 'arms', 'head'] as const) {
                const part = MODULAR_WARDROBE[parts[slot] ?? ''];
                if (!part) continue;
                const c = parseHexColor(part.color);
                const dark = shadeRgb(c, 0.62);
                const light = shadeRgb(c, 1.25);
                const set = part.setName;
                if (slot === 'legs') {
                    this.outfit.fillStyle(c);
                    this.outfit.fillRect(-9, 12, 7, 10 + stride);
                    this.outfit.fillRect(3, 12, 7, 10 - stride);
                    this.outfit.fillStyle(dark);
                    this.outfit.fillRect(-10, 20 + stride, 9, 4);
                    this.outfit.fillRect(2, 20 - stride, 9, 4);
                    if (set === 'Void Knight') {
                        this.outfit.fillStyle(light);
                        this.outfit.fillTriangle(-10, 12, -2, 12, -6, 8);
                        this.outfit.fillTriangle(2, 12, 10, 12, 6, 8);
                    }
                    if (set === 'Neon Technician') {
                        this.outfit.fillStyle(0x7fdfff);
                        this.outfit.fillRect(-8, 16 + stride, 2, 6);
                        this.outfit.fillRect(6, 16 - stride, 2, 6);
                    }
                }
                if (slot === 'torso') {
                    if (set === 'Salvage Ranger' || set === 'Void Knight') {
                        this.outfit.fillStyle(dark);
                        this.outfit.fillTriangle(-16, -4, 0, 18, -18, 22);
                    }
                    this.outfit.fillStyle(hurt ? 0xffffff : c);
                    this.outfit.fillRect(-10, -6, 20, 18);
                    this.outfit.fillStyle(0x243744);
                    this.outfit.fillRect(-3, -3, 5, 12);
                    this.outfit.fillStyle(light);
                    if (set === 'Frontier Pioneer') this.outfit.fillRect(4, 2, 5, 4);
                    if (set === 'Neon Technician') {
                        this.outfit.fillStyle(0x7fdfff);
                        this.outfit.fillRect(-1, -4, 2, 14);
                        this.outfit.fillRect(-8, 4, 16, 1);
                    }
                }
                if (slot === 'arms') {
                    this.outfit.fillStyle(c);
                    this.outfit.fillRect(-15, -5 + stride, 5, 17);
                    this.outfit.fillRect(10, -5 - stride, 5, 17);
                    this.outfit.fillStyle(dark);
                    this.outfit.fillRect(-16, 8 + stride, 6, 4);
                    this.outfit.fillRect(10, 8 - stride, 6, 4);
                    if (set === 'Void Knight') {
                        this.outfit.fillStyle(light);
                        this.outfit.fillTriangle(-16, -5 + stride, -10, -5 + stride, -13, -10 + stride);
                    }
                    if (set === 'Neon Technician') {
                        this.outfit.fillStyle(0x7fdfff);
                        this.outfit.fillRect(-15, 2 + stride, 5, 1);
                        this.outfit.fillRect(10, 2 - stride, 5, 1);
                    }
                }
                if (slot === 'head') {
                    this.outfit.fillStyle(c);
                    this.outfit.fillRect(-11, -22, 22, 15);
                    this.outfit.fillStyle(0xd5fff1);
                    this.outfit.fillRect(0, -17, 13, 4);
                    if (set === 'Salvage Ranger') {
                        this.outfit.fillStyle(dark);
                        this.outfit.fillRect(-16, -20, 32, 4);
                        this.outfit.fillStyle(c);
                        this.outfit.fillRect(-8, -26, 16, 6);
                    }
                    if (set === 'Void Knight') {
                        this.outfit.fillStyle(light);
                        this.outfit.fillTriangle(-10, -22, -4, -22, -8, -32);
                        this.outfit.fillTriangle(4, -22, 10, -22, 8, -32);
                    }
                    if (set === 'Neon Technician') {
                        this.outfit.fillStyle(0x7fdfff);
                        this.outfit.fillRect(-9, -32, 2, 10);
                        this.outfit.fillRect(7, -32, 2, 10);
                    }
                    if (set === 'Frontier Pioneer') {
                        this.outfit.fillStyle(dark);
                        this.outfit.fillRect(-11, -14, 22, 3);
                    }
                }
            }
            const item = store.world.inventory[this.selected]?.id;
            const isMeleeWeapon = ['sword', 'sword_long', 'spear', 'hammer_heavy', 'lightsaber'].includes(item ?? '');
            const isMagicWeapon = ['staff', 'staff_ember', 'wand_frost', 'staff_arc', 'tome_crystal'].includes(item ?? '');
            const isTool = !!getToolProfile(item ?? '');
            const gunFamily = GUN_FAMILIES.find(id => id === item);
            const gunSkinId = gunFamily ? store.data.profile.guns?.[gunFamily] : undefined;
            const heldGunKey = gunFamily ? heldGunTextureKey(item!, gunSkinId) : null;
            const heldKey = item
                ? gunFamily
                    ? heldGunKey
                    : `icon-${item}`
                : null;
            const heldTex = (heldKey && this.textures.exists(heldKey) ? heldKey : null)
                || (heldGunKey && this.textures.exists(heldGunKey) ? heldGunKey : null)
                || (gunFamily && this.textures.exists('gun-tool') ? 'gun-tool' : null)
                || (item && this.textures.exists(`icon-${item}`) ? `icon-${item}` : null);
            const aimHeld = isMeleeWeapon || isMagicWeapon || !!WEAPONS[item!] || isTool;
            if (heldTex) {
                this.weapon.setTexture(heldTex).setVisible(true).clearTint();
                this.weapon.setOrigin(gunFamily ? 0.18 : aimHeld ? 0.35 : 0.5, gunFamily ? 0.55 : aimHeld ? 0.55 : 0.7);
                this.weapon.setScale(1);
            } else {
                this.weapon.setVisible(false).setScale(1);
            }

            const angle = this.cursor.known
                ? Math.atan2(this.cursor.y - this.player.y, this.cursor.x - this.player.x)
                : this.facing < 0 ? Math.PI : 0;
            const aimSide = Math.cos(angle) >= 0 ? 1 : -1;
            const handX = this.player.x + (aimHeld ? aimSide : this.facing) * (aimHeld ? 14 : 12);
            const handY = this.player.y + (aimHeld ? 4 + Math.sin(angle) * 2 : 10);
            this.weapon.setPosition(handX, handY);
            if (gunFamily) {
                this.weapon
                    .setScale(1, 1)
                    .setFlipX(false)
                    .setFlipY(aimSide < 0)
                    .setRotation(angle);
            } else if (aimHeld) {
                const pitch = Math.atan2(Math.sin(angle), Math.abs(Math.cos(angle)) || 0.001);
                this.weapon
                    .setScale(1, 1)
                    .setFlipY(false)
                    .setFlipX(aimSide < 0)
                    .setRotation(pitch);
            } else {
                this.weapon
                    .setScale(1, 1)
                    .setFlipY(false)
                    .setFlipX(false)
                    .setRotation(0);
            }
            const { x, y } = this.targetTile();
            this.target.clear();
            if(store.world.generator>=2) {
                const bossMode = store.world.settings.difficulty === 'boss';
                const rangeX = bossMode ? 3600 : 900;
                const rangeY = bossMode ? 2000 : 520;
                for(const site of bossSites(store.world.settings)) {
                    const sx = site.x * TILE, sy = site.floor * TILE;
                    const dx = sx - this.player.x, dy = sy - this.player.y;
                    const near = Math.abs(dx) < rangeX && Math.abs(dy) < rangeY;
                    if (bossMode || near) {
                        const h = bossMode ? 210 : 64;
                        this.target.fillStyle(0xc6adf4, bossMode ? 0.32 : 0.55);
                        this.target.fillRect(sx - (bossMode ? 7 : 4), sy - h, bossMode ? 14 : 8, h);
                        this.target.fillStyle(0xf8e6ff, 0.95);
                        this.target.fillCircle(sx, sy - h - 8, bossMode ? 12 : 6);
                        this.target.lineStyle(3, 0xe08db4, 0.95);
                        this.target.strokeTriangle(sx - 18, sy - 5, sx, sy - Math.min(88, h * 0.45), sx + 18, sy - 5);
                    }
                    if (near && !(store.world.discoveredBosses ?? []).includes(site.id)) {
                        void this.transact((_b, w) => {
                            w.discoveredBosses ??= [];
                            if (!w.discoveredBosses.includes(site.id)) w.discoveredBosses.push(site.id);
                            return `Discovered ${BOSS_REGISTRY[site.id].name}: press E at the shrine when ready.`;
                        });
                    }
                }
                if (bossMode) {
                    const next = bossSites(store.world.settings)
                        .filter(s => !store.world.defeated.includes(`boss:${s.id}`))
                        .map(s => ({ s, d: Math.hypot(s.x * TILE - this.player.x, s.floor * TILE - this.player.y) }))
                        .sort((a, b) => a.d - b.d)[0];
                    if (next && next.d > 90) {
                        const dx = next.s.x * TILE - this.player.x, dy = next.s.floor * TILE - this.player.y, dist = next.d || 1;
                        const ax = this.player.x + dx / dist * 110, ay = this.player.y + dy / dist * 110 - 36;
                        const px = -dy / dist, py = dx / dist;
                        this.target.fillStyle(0xffe08a, 0.95);
                        this.target.fillTriangle(ax + dx / dist * 18, ay + dy / dist * 18, ax + px * 11, ay + py * 11, ax - px * 11, ay - py * 11);
                    }
                }
            }
            const isBuilding = item && BUILDING[item] !== undefined;
            if (isTool) {
                this.target.lineStyle(2, this.inReach(x, y) ? 0x8df6d1 : 0xef998c, .8);
                this.target.strokeRect(x * TILE, y * TILE, TILE, TILE);
            } else if (isBuilding) {
                const mat = BUILDING[item!]!;
                const inRange = this.inReach(x, y, 5.5);
                const targetEmpty = readTile(store.world, x, y) === 0;
                const canPlace = inRange && targetEmpty;
                this.target.lineStyle(2, canPlace ? 0x62dfc3 : 0xff7b72, 0.9);
                this.target.strokeRect(x * TILE, y * TILE, TILE, TILE);
                const previewColor = MATERIALS[mat]?.color ?? 0xffffff;
                this.target.fillStyle(previewColor, canPlace ? 0.45 : 0.2);
                this.target.fillRect(x * TILE, y * TILE, TILE, TILE);

                const isTotem = ['totem_vitality', 'totem_warding', 'totem_prospector', 'totem_arcane'].includes(item!);
                if (isTotem) {
                    const totemDef = TOTEM_REGISTRY[item!];
                    if (totemDef) {
                        const radiusPx = totemDef.radiusTiles * TILE;
                        const totemColor = parseHexColor(totemDef.color, 0x2ecc71);
                        this.target.lineStyle(2, totemColor, 0.75);
                        this.target.strokeCircle((x + 0.5) * TILE, (y + 0.5) * TILE, radiusPx);
                        this.target.fillStyle(totemColor, 0.12);
                        this.target.fillCircle((x + 0.5) * TILE, (y + 0.5) * TILE, radiusPx);
                    }
                }
            }
            if (this.held.has('Mouse') || this.held.has('KeyJ') || this.fresh.has('KeyJ')) {
                if (item && getToolProfile(item))
                    this.mine(Math.min(delta, 50));
                else
                    this.attack();
            }
            else
                this.mining.progress = 0;
            if (this.fresh.has('KeyF') || this.fresh.has('RightMouse'))
                this.place();
            if (this.held.has('KeyE')) {
                if (this.findHarvestable()) this.gather(Math.min(delta, 50));
                else if (this.fresh.has('KeyE')) this.interact();
            } else {
                this.gathering = { id: '', progress: 0, kind: 'herb' };
                if (this.fresh.has('KeyE')) this.interact();
            }
            if (this.fresh.has('KeyH'))
                this.recall();
            if (this.recallStart && this.clock - this.recallStart >= 2500) {
                this.respawn();
                void this.save().catch(() => { });
            }
            if (this.clock - this.lastMagic > 1800)
                this.mana = Math.min(stats.maxMana, this.mana + delta * .018);
            if (store.world.inventory[this.selected]?.id === 'lightsaber') {
                for (const obj of [...this.hostile.getChildren()])
                    this.reflectLightsaberShot(obj as Phaser.Physics.Arcade.Sprite);
            }
            for (const group of [this.shots, this.hostile])
                for (const s of group.getChildren())
                    if (this.clock > (s as Phaser.Physics.Arcade.Sprite).getData('expires'))
                        s.destroy();
            if (this.clock - this.lastAi > 30) {
                this.ai();
                this.wildlife.update(this.clock, this.player);
                this.lastAi = this.clock;
            }
            const d = store.world.settings.difficulty;
            const spawnMs = d === 'extreme' ? 70 : d === 'standard' ? 320 : d === 'boss' ? 5200 : 800;
            if (this.clock - this.lastSpawn > spawnMs) {
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
    const refreshScale = () => { try { game.scale.refresh(); } catch { /* parent may be unmounting */ } };
    const onFullscreen = () => refreshScale();
    requestAnimationFrame(refreshScale);
    window.addEventListener('resize', refreshScale);
    document.addEventListener('fullscreenchange', onFullscreen);
    host.tabIndex = 0;
    const save = () => scene?.save() ?? Promise.resolve();
    const keydown = (e: KeyboardEvent) => {
        if (!scene) return;
        if (e.code === 'KeyR' && scene.status === 'dead') {
            e.preventDefault();
            scene.respawn();
            return;
        }
        if (document.activeElement !== host) return;
        if (['Space', 'ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'KeyJ', 'KeyE', 'KeyF', 'KeyH', 'Escape', 'KeyR', 'KeyI', 'KeyC', 'KeyM', 'KeyQ'].includes(e.code) || /^Digit[1-8]$/.test(e.code))
            e.preventDefault();
        if (e.repeat) return; if (/^Digit[1-8]$/.test(e.code)) {
        scene.selected = Number(e.code.slice(-1)) - 1;
        scene.emit();
        return;
    } if (e.code === 'Escape') {
        if (scene.status === 'paused')
            scene.resume();
        else
            scene.pause();
        return;
    } if (e.code === 'KeyQ' && scene.status === 'playing') {
        scene.castBlink();
        return;
    } if (e.code === 'KeyR') {
        if (scene.status === 'dead') {
            scene.respawn();
        } else if (scene.status === 'playing') {
            scene.castShield();
        }
        return;
    } if (['KeyI', 'KeyC', 'KeyM'].includes(e.code)) {
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
        } }, recall: () => { host.focus(); scene?.resume(); scene?.recall(); }, respawn: () => { host.focus(); scene?.respawn(); }, save, setVolume: n => { sound.setVolume(n); gameAudio.setVolume(n); }, feedback: () => { sound.unlock();sound.play('reward'); }, setShake: b => { if (scene)
            scene.shake = b; }, setHealth: n => { scene?.setHealth(n); }, setMana: n => { scene?.setMana(n); }, setHunger: n => { scene?.setHunger(n); },
        capturePlayer: () => scene ? {health:scene.health,mana:scene.mana,effects:structuredClone(scene.activeEffects),shieldBudget:scene.shieldBudget} : undefined,
        applyCreation: (spec, at) => { if(!scene)throw Error('Game is not ready');return scene.applyCreation(spec, at); },
        removeCreation: id => {
            scene?.creator?.runtime.remove(id);scene?.creator?.draw();scene?.emit();
            void store.transact((_b,w)=>{ w.creations = (w.creations ?? []).filter(c => c.spec.id !== id); });
        },
        resetCreations: () => {
            scene?.creator?.runtime.reset();scene?.creator?.draw();scene?.emit();
            void store.transact((_b,w)=>{ w.creations = []; });
        },
            castBlink: () => { host.focus(); scene?.castBlink(); }, castShield: () => { host.focus(); scene?.castShield(); },
            destroy: () => { disposed = true; scene?.creator?.destroy(); sound.close(); window.removeEventListener('resize', refreshScale); document.removeEventListener('fullscreenchange', onFullscreen); window.removeEventListener('keydown', keydown); window.removeEventListener('keyup', keyup); window.removeEventListener('pointerup', up); window.removeEventListener('blur', blur); document.removeEventListener('visibilitychange', hidden); host.removeEventListener('pointermove', move); host.removeEventListener('pointerdown', down); host.removeEventListener('contextmenu', context); host.removeEventListener('blur', blur); game.destroy(true); } };
}
