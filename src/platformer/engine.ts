import Phaser from 'phaser';
import { createAssets } from './assets';
import { validateConfig, type GameConfig, type EnemyKind } from './config';
import { generateRoom, type Room } from './rooms';
export interface Hud {
    health: number;
    score: number;
    room: number;
    name: string;
    core: boolean;
    status: 'paused' | 'playing' | 'dead' | 'won';
    message: string;
}
export interface Controller {
    pause: () => void;
    resume: () => void;
    restart: () => void;
    destroy: () => void;
}
export function startGame(host: HTMLElement, config: GameConfig, onHud: (h: Hud) => void): Controller {
    validateConfig(config);
    let scene: PlatformScene | undefined;
    class PlatformScene extends Phaser.Scene {
        player!: Phaser.Physics.Arcade.Sprite;
        solids!: Phaser.Physics.Arcade.StaticGroup;
        platforms!: Phaser.Physics.Arcade.StaticGroup;
        foes!: Phaser.Physics.Arcade.Group;
        shots!: Phaser.Physics.Arcade.Group;
        hostile!: Phaser.Physics.Arcade.Group;
        room!: Room;
        index = 0;
        health = 100;
        score = 0;
        entryHealth = 100;
        entryScore = 0;
        core = false;
        status: Hud['status'] = 'paused';
        face = 1;
        lastGround = -1000;
        buffer = -1000;
        jumped = false;
        airJump = false;
        lastFire = -1000;
        invulnerable = 0;
        knockUntil = 0;
        clock = 0;
        held = new Set<string>();
        fresh = new Set<string>();
        door!: Phaser.GameObjects.Image;
        label!: Phaser.GameObjects.Text;
        roomStart = 0;
        constructor() { super('Platformer'); scene = this; }
        create() { createAssets(this, { cyan: 0x58d9ce, amber: 0xf6bd63, violet: 0xb69aff }[config.palette]); this.loadRoom(); }
        emit() { onHud({ health: this.health, score: this.score, room: this.index + 1, name: this.room.name, core: this.core, status: this.status, message: this.core ? 'Core secured · Find the exit and press E' : 'Find the energy core · Reach the exit' }); }
        loadRoom(restarting = false) {
            this.tweens.killAll();
            this.time.removeAllEvents();
            this.physics.world.colliders.destroy();
            for (const group of [this.solids, this.platforms, this.foes, this.shots, this.hostile])
                group?.destroy(true);
            this.children.removeAll(true);
            this.room = generateRoom(this.index, config);
            this.core = false;
            this.face = 1;
            this.knockUntil = 0;
            this.cameras.main.resetFX();
            this.held.clear();
            this.fresh.clear();
            this.buffer = -1000;
            this.lastGround = -1000;
            this.airJump = false;
            this.jumped = false;
            this.lastFire = -1000;
            this.roomStart = this.clock;
            this.invulnerable = this.clock + 1800;
            const r = this.room;
            if (r.recovery && !restarting)
                this.health = Math.min(100, this.health + 35);
            this.entryHealth = this.health;
            this.entryScore = this.score;
            this.cameras.main.setBackgroundColor('#090f20');
            this.physics.world.setBounds(0, -300, r.width, r.height + 600);
            const bg = this.add.graphics().setScrollFactor(.18);
            bg.fillStyle(0x111f34);
            for (let x = 0; x < 2600; x += 160) {
                bg.fillRect(x, 40, 85, 420);
                bg.fillStyle(0x1a3043);
                bg.fillRect(x + 8, 80, 4, 280);
                bg.fillStyle(0x111f34);
            }
            const back = this.add.graphics().setScrollFactor(.45);
            back.lineStyle(2, 0x294252, .6);
            for (let x = 0; x < 2600; x += 240) {
                back.strokeRect(x, 210, 200, 120);
                back.lineBetween(x, 350, x + 170, 350);
            }
            this.add.text(80, 100, `SECTOR ${String(this.index + 1).padStart(2, '0')} / ${r.name.toUpperCase()}`, { fontFamily: 'monospace', fontSize: '20px', color: '#54778d' });
            this.solids = this.physics.add.staticGroup();
            this.platforms = this.physics.add.staticGroup();
            for (const p of r.surfaces) {
                this.add.tileSprite(p.x, p.y, p.w, p.h, 'tile').setOrigin(0);
                const box = this.add.rectangle(p.x + p.w / 2, p.y + p.h / 2, p.w, p.h, 0xffffff, 0);
                this.physics.add.existing(box, true);
                (p.oneWay ? this.platforms : this.solids).add(box);
                if (p.oneWay)
                    this.add.rectangle(p.x + p.w / 2, p.y + 2, p.w, 4, 0x7ef4e0);
            }
            this.player = this.physics.add.sprite(r.spawn.x, r.spawn.y, 'hero-idle').setDepth(8);
            this.player.setSize(24, 42).setOffset(8, 4);
            this.player.setMaxVelocity(config.movement.speed, config.movement.maxFall);
            this.physics.add.collider(this.player, this.solids);
            this.physics.add.collider(this.player, this.platforms, undefined, (a, b) => { const body = (a as Phaser.Physics.Arcade.Sprite).body as Phaser.Physics.Arcade.Body; const platform = (b as Phaser.GameObjects.Rectangle).body as Phaser.Physics.Arcade.StaticBody; return body.velocity.y >= 0 && body.prev.y + body.height <= platform.top + 6; });
            this.shots = this.physics.add.group({ allowGravity: false });
            this.hostile = this.physics.add.group({ allowGravity: false });
            this.foes = this.physics.add.group();
            for (const e of r.enemies) {
                const foe = this.foes.create(e.x, e.y, e.kind) as Phaser.Physics.Arcade.Sprite;
                foe.setData({ kind: e.kind, hp: config.enemies[e.kind].health, homeX: e.x, homeY: e.y, direction: -1, next: this.clock + config.enemies[e.kind].interval, warning: false });
                foe.setSize(30, e.kind === 'drone' ? 24 : 36);
                if (e.kind !== 'walker')
                    (foe.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
            }
            this.physics.add.collider(this.foes, this.solids);
            this.physics.add.collider(this.foes, this.platforms);
            this.physics.add.overlap(this.player, this.foes, (_p, f) => this.damage(config.enemies[(f as Phaser.Physics.Arcade.Sprite).getData('kind') as EnemyKind].damage, (f as Phaser.Physics.Arcade.Sprite).x));
            this.physics.add.collider(this.shots, this.solids, s => { this.burst((s as Phaser.Physics.Arcade.Sprite).x, (s as Phaser.Physics.Arcade.Sprite).y, 0x80ffff); s.destroy(); });
            this.physics.add.collider(this.hostile, this.solids, s => s.destroy());
            this.physics.add.overlap(this.shots, this.foes, (s, f) => { if (!(s as Phaser.Physics.Arcade.Sprite).active || !(f as Phaser.Physics.Arcade.Sprite).active)
                return; s.destroy(); const foe = f as Phaser.Physics.Arcade.Sprite; const hp = Number(foe.getData('hp')) - config.weapon.damage; foe.setData('hp', hp); this.burst(foe.x, foe.y, 0xffae89); foe.setTintFill(0xffffff); this.time.delayedCall(85, () => { if (foe.active)
                foe.clearTint(); }); if (hp <= 0) {
                foe.destroy();
                this.score += 100;
                this.emit();
            } });
            this.physics.add.overlap(this.player, this.hostile, (_p, s) => { this.damage(config.enemies.turret.damage, (s as Phaser.Physics.Arcade.Sprite).x); s.destroy(); });
            const core = this.physics.add.staticImage(r.core.x, r.core.y, 'core');
            this.tweens.add({ targets: core, alpha: .5, duration: 600, yoyo: true, repeat: -1 });
            this.physics.add.overlap(this.player, core, () => { if (!core.active)
                return; this.burst(core.x, core.y, 0x6affde); core.destroy(); this.core = true; this.score += 250; this.door.setTint(0x72ffe0); this.emit(); });
            for (const reward of r.rewards) {
                const gem = this.physics.add.staticImage(reward.x, reward.y, 'core').setTint(0xffda87).setScale(.65);
                this.physics.add.overlap(this.player, gem, () => { if (!gem.active)
                    return; this.score += reward.value; this.burst(gem.x, gem.y, 0xffda87); gem.destroy(); this.emit(); });
            }
            for (const spike of r.spikes) {
                const obj = this.physics.add.staticImage(spike.x + 24, spike.y - 10, 'spikes');
                this.physics.add.overlap(this.player, obj, () => this.damage(25, obj.x));
            }
            this.door = this.add.image(r.exit.x, r.exit.y - 6, 'door').setTint(0x70899c);
            this.label = this.add.text(r.exit.x, r.exit.y - 66, 'CORE REQUIRED', { fontFamily: 'monospace', fontSize: '13px', color: '#9ac6cf' }).setOrigin(.5);
            this.add.rectangle(r.spawn.x - 35, 460, 8, 40, 0x62dbc7);
            this.add.text(r.spawn.x - 65, 405, 'CHECKPOINT', { fontFamily: 'monospace', fontSize: '11px', color: '#62dbc7' });
            this.cameras.main.setBounds(0, 0, r.width, 640);
            this.cameras.main.startFollow(this.player, true, .12, .12, 0, 45);
            this.cameras.main.setDeadzone(160, 90);
            this.physics.world.isPaused = this.status !== 'playing';
            this.emit();
        }
        burst(x: number, y: number, color: number) { for (let i = 0; i < 6; i++) {
            const p = this.add.rectangle(x, y, 3, 3, color).setDepth(10);
            this.tweens.add({ targets: p, x: x + (i - 2.5) * 8, y: y - 12 - Math.random() * 20, alpha: 0, duration: 280, onComplete: () => p.destroy() });
        } }
        pause() { if (this.status !== 'playing')
            return; this.status = 'paused'; this.held.clear(); this.fresh.clear(); this.physics.pause(); this.tweens.pauseAll(); this.emit(); }
        resume() { if (this.status !== 'paused')
            return; this.status = 'playing'; this.physics.resume(); this.tweens.resumeAll(); this.emit(); }
        restart() { this.health = this.entryHealth; this.score = this.entryScore; this.status = 'playing'; this.tweens.resumeAll(); this.loadRoom(true); }
        damage(amount: number, x: number) { if (this.status !== 'playing' || this.clock < this.invulnerable)
            return; this.health = Math.max(0, this.health - amount); this.invulnerable = this.clock + 1100; this.knockUntil = this.clock + 170; this.player.setAccelerationX(0); this.player.setVelocity(this.player.x < x ? -170 : 170, -180); this.burst(this.player.x, this.player.y, 0xff8195); if (config.shake)
            this.cameras.main.shake(100, .003); if (this.health === 0)
            this.die(); this.emit(); }
        die() { this.health = 0; this.status = 'dead'; this.physics.pause(); this.held.clear(); this.emit(); }
        fire() { if (this.clock - this.lastFire < config.weapon.cooldown || this.shots.countActive() >= config.weapon.cap)
            return; this.lastFire = this.clock; const x = this.player.x + this.face * 26, y = this.player.y + 1; const s = this.shots.create(x, y, 'shot') as Phaser.Physics.Arcade.Sprite; s.setVelocityX(this.face * config.weapon.speed); s.setData('expires', this.clock + config.weapon.lifetime); this.burst(x, y, 0xb8fff0); }
        lineOfSight(x: number, y: number) { const line = new Phaser.Geom.Line(x, y, this.player.x, this.player.y); return !this.room.surfaces.some(s => !s.oneWay && Phaser.Geom.Intersects.LineToRectangle(line, new Phaser.Geom.Rectangle(s.x, s.y, s.w, s.h))); }
        update(_time: number, delta: number) {
            if (!this.player || this.status !== 'playing')
                return;
            this.clock += Math.min(delta, 50);
            const now = this.clock, m = config.movement, b = this.player.body as Phaser.Physics.Arcade.Body;
            const grounded = b.blocked.down || b.touching.down;
            if (grounded) {
                if (this.jumped)
                    this.burst(this.player.x, this.player.y + 20, 0x80c6c9);
                this.lastGround = now;
                this.airJump = false;
                this.jumped = false;
            }
            if (this.fresh.has('Space'))
                this.buffer = now;
            if (now - this.buffer <= m.bufferMs && (now - this.lastGround <= m.coyoteMs && !this.jumped || m.doubleJump && !this.airJump && !grounded)) {
                if (!(now - this.lastGround <= m.coyoteMs && !this.jumped))
                    this.airJump = true;
                this.player.setVelocityY(-m.jump);
                this.jumped = true;
                this.lastGround = -1000;
                this.buffer = -1000;
            }
            if (!this.held.has('Space') && b.velocity.y < -330)
                this.player.setVelocityY(-330);
            const direction = Number(this.held.has('KeyD') || this.held.has('ArrowRight')) - Number(this.held.has('KeyA') || this.held.has('ArrowLeft'));
            if (now >= this.knockUntil) {
                this.player.setAccelerationX(direction * m.acceleration);
                this.player.setDragX(direction ? 0 : m.deceleration);
            }
            if (direction)
                this.face = direction;
            this.player.setFlipX(this.face < 0);
            const hurt = now < this.invulnerable;
            this.player.setAlpha(hurt && Math.floor(now / 80) % 2 ? .45 : 1);
            this.player.setTexture(`hero-${hurt && now > this.roomStart + 1800 ? 'hurt' : !grounded ? (b.velocity.y < 0 ? 'air' : 'fall') : direction ? `run${Math.floor(now / 100) % 2}` : 'idle'}`);
            if (this.held.has('KeyJ') || this.held.has('Mouse') || this.fresh.has('KeyJ') || this.fresh.has('Mouse'))
                this.fire();
            for (const group of [this.shots, this.hostile])
                for (const obj of group.getChildren()) {
                    const shot = obj as Phaser.Physics.Arcade.Sprite;
                    if (now > shot.getData('expires'))
                        shot.destroy();
                }
            for (const obj of this.foes.getChildren()) {
                const f = obj as Phaser.Physics.Arcade.Sprite, kind = f.getData('kind') as EnemyKind, params = config.enemies[kind], body = f.body as Phaser.Physics.Arcade.Body;
                const speed = Math.min(params.speed * (1 + this.index * .035), config.difficulty.speedCap);
                if (kind === 'walker') {
                    let dir = f.getData('direction') as number;
                    const ahead = f.x + dir * 24;
                    const floor = this.room.surfaces.some(s => ahead >= s.x && ahead <= s.x + s.w && Math.abs(s.y - body.bottom) < 12);
                    if (body.blocked.left || body.blocked.right || !floor)
                        dir *= -1;
                    f.setData('direction', dir);
                    f.setVelocityX(speed * dir);
                    f.setFlipX(dir > 0);
                    f.setAngle(Math.sin(now / 100) * 3);
                }
                if (kind === 'drone') {
                    const near = Phaser.Math.Distance.Between(f.x, f.y, this.player.x, this.player.y) < params.range && this.lineOfSight(f.x, f.y);
                    const tx = near ? this.player.x : f.getData('homeX') + Math.sin(now / 1100) * 75, ty = near ? this.player.y : f.getData('homeY') + Math.sin(now / 500) * 22;
                    const v = new Phaser.Math.Vector2(tx - f.x, ty - f.y).limit(speed);
                    if (Math.abs(f.x - f.getData('homeX')) > 170)
                        v.x = (f.getData('homeX') - f.x) * .7;
                    f.setVelocity(v.x, v.y);
                }
                if (kind === 'turret' && (!this.lineOfSight(f.x, f.y) || Phaser.Math.Distance.Between(f.x, f.y, this.player.x, this.player.y) >= params.range)) {
                    f.setData('next', now + params.interval);
                    f.clearTint();
                }
                if (kind === 'turret' && now > this.roomStart + 1800 && Phaser.Math.Distance.Between(f.x, f.y, this.player.x, this.player.y) < params.range && this.lineOfSight(f.x, f.y)) {
                    const next = f.getData('next') as number;
                    if (now > next - 450)
                        f.setTint(0xff514f);
                    if (now > next && this.hostile.countActive() < 20) {
                        const s = this.hostile.create(f.x, f.y - 8, 'hostile') as Phaser.Physics.Arcade.Sprite;
                        const v = new Phaser.Math.Vector2(this.player.x - f.x, this.player.y - f.y).normalize().scale(210);
                        s.setVelocity(v.x, v.y);
                        s.setData('expires', now + 3000);
                        f.setData('next', now + params.interval);
                        f.clearTint();
                    }
                }
            }
            this.label.setText(this.core ? '[ E ] NEXT ROOM' : 'CORE REQUIRED');
            if (this.fresh.has('KeyE') && this.core && Math.abs(this.player.x - this.room.exit.x) < 65 && Math.abs(this.player.y - this.room.exit.y) < 80) {
                if (config.generation.mode === 'demo' && this.index + 1 >= config.generation.demoRooms) {
                    this.status = 'won';
                    this.physics.pause();
                    this.emit();
                }
                else {
                    this.index++;
                    this.loadRoom();
                }
            }
            if (this.player.y > this.room.height + 60)
                this.die();
            this.player.x = Phaser.Math.Clamp(this.player.x, 14, this.room.width - 14);
            this.fresh.clear();
        }
    }
    const game = new Phaser.Game({ type: Phaser.AUTO, parent: host, width: 960, height: 540, pixelArt: true, roundPixels: true, banner: false, audio: { noAudio: true }, physics: { default: 'arcade', arcade: { gravity: { x: 0, y: config.movement.gravity }, fps: 120 } }, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: [PlatformScene] });
    host.tabIndex = 0;
    const down = (e: KeyboardEvent) => { if (document.activeElement !== host || !scene)
        return; if (['Space', 'ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'KeyJ', 'KeyE', 'Escape', 'KeyR'].includes(e.code))
        e.preventDefault(); if (e.repeat)
        return; if (e.code === 'Escape') {
        if (scene.status === 'paused')
            scene.resume();
        else
            scene.pause();
        return;
    } if (e.code === 'KeyR' && scene.status === 'dead') {
        scene.restart();
        return;
    } scene.held.add(e.code); scene.fresh.add(e.code); };
    const up = (e: KeyboardEvent) => scene?.held.delete(e.code);
    const pointer = (e: PointerEvent) => { if (e.button !== 0)
        return; host.focus(); if (scene?.status === 'paused')
        scene.resume(); scene?.held.add('Mouse'); scene?.fresh.add('Mouse'); };
    const release = () => scene?.held.delete('Mouse');
    const blur = () => scene?.pause();
    const visibility = () => { if (document.hidden)
        scene?.pause(); };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    window.addEventListener('pointerup', release);
    host.addEventListener('pointerdown', pointer);
    host.addEventListener('blur', blur);
    return { pause: () => scene?.pause(), resume: () => { host.focus(); scene?.resume(); }, restart: () => { host.focus(); scene?.restart(); }, destroy: () => { document.removeEventListener('visibilitychange', visibility); window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); window.removeEventListener('pointerup', release); host.removeEventListener('pointerdown', pointer); host.removeEventListener('blur', blur); game.destroy(true); } };
}
