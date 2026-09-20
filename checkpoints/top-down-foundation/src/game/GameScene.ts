import Phaser from "phaser";
import type { GameConfig, GameHudState, GameStatus, HudListener } from "./types";

export const GAME_SCENE_KEY = "GameScene";

interface SceneData {
  config: GameConfig;
  onHud: HudListener;
}

function hex(color: string): number {
  return Number.parseInt(color.replace("#", ""), 16);
}

function tileCenter(config: GameConfig, x: number, y: number): { x: number; y: number } {
  return {
    x: (x + 0.5) * config.tileSize,
    y: (y + 0.5) * config.tileSize,
  };
}

export class GameScene extends Phaser.Scene {
  private config!: GameConfig;
  private onHud!: HudListener;
  private player!: Phaser.Physics.Arcade.Sprite;
  private enemies!: Phaser.Physics.Arcade.Group;
  private pickups!: Phaser.Physics.Arcade.Group;
  private hazards!: Phaser.Physics.Arcade.Group;
  private exit!: Phaser.Physics.Arcade.Image;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<"up" | "down" | "left" | "right", Phaser.Input.Keyboard.Key>;
  private health = 0;
  private collected = 0;
  private status: GameStatus = "playing";
  private invulnerableUntil = 0;
  private overlay?: Phaser.GameObjects.Container;

  constructor() {
    super(GAME_SCENE_KEY);
  }

  init(data: SceneData): void {
    this.config = data.config;
    this.onHud = data.onHud;
    this.health = data.config.player.health;
    this.collected = 0;
    this.status = "playing";
    this.invulnerableUntil = 0;
  }

  create(): void {
    const config = this.config;
    const { tileSize, map, palette } = config;

    this.cameras.main.setBackgroundColor(palette.background);
    this.createTextures();
    this.drawMap();

    const walls = this.physics.add.staticGroup();
    for (let y = 0; y < map.length; y += 1) {
      for (let x = 0; x < map[y].length; x += 1) {
        if (map[y][x] !== 1) continue;
        const wall = this.physics.add.staticImage(
          (x + 0.5) * tileSize,
          (y + 0.5) * tileSize,
          "wall-body",
        );
        wall.setVisible(false);
        walls.add(wall);
      }
    }

    const spawn = tileCenter(config, config.player.x, config.player.y);
    this.player = this.physics.add.sprite(spawn.x, spawn.y, "player");
    this.player.setCircle(12, 4, 4);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(5);

    this.enemies = this.physics.add.group();
    for (const enemy of config.enemies) {
      const pos = tileCenter(config, enemy.x, enemy.y);
      const sprite = this.physics.add.sprite(pos.x, pos.y, "enemy");
      sprite.setData("speed", enemy.speed);
      sprite.setData("damage", enemy.damage);
      sprite.setCircle(12, 4, 4);
      sprite.setDepth(4);
      this.enemies.add(sprite);
    }

    this.pickups = this.physics.add.group();
    for (const pickup of config.pickups) {
      const pos = tileCenter(config, pickup.x, pickup.y);
      const sprite = this.physics.add.sprite(pos.x, pos.y, "pickup");
      sprite.setData("label", pickup.label);
      sprite.setImmovable(true);
      this.tweens.add({
        targets: sprite,
        y: pos.y - 4,
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: "Sine.InOut",
      });
      this.pickups.add(sprite);
    }

    this.hazards = this.physics.add.group();
    for (const hazard of config.hazards) {
      const pos = tileCenter(config, hazard.x, hazard.y);
      const sprite = this.physics.add.sprite(pos.x, pos.y, "hazard");
      sprite.setData("damage", hazard.damage);
      sprite.setImmovable(true);
      this.tweens.add({
        targets: sprite,
        alpha: 0.45,
        duration: 450,
        yoyo: true,
        repeat: -1,
      });
      this.hazards.add(sprite);
    }

    const exitPos = tileCenter(config, config.win.exit.x, config.win.exit.y);
    this.exit = this.physics.add.image(exitPos.x, exitPos.y, "exit-locked");
    this.exit.setImmovable(true);

    this.physics.add.collider(this.player, walls);
    this.physics.add.collider(this.enemies, walls);
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.overlap(this.player, this.pickups, this.collectPickup, undefined, this);
    this.physics.add.overlap(this.player, this.enemies, this.hitEnemy, undefined, this);
    this.physics.add.overlap(this.player, this.hazards, this.hitHazard, undefined, this);
    this.physics.add.overlap(this.player, this.exit, this.tryExit, undefined, this);

    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error("Keyboard input is unavailable.");
    }
    this.cursors = keyboard.createCursorKeys();
    this.wasd = {
      up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    this.emitHud();
  }

  update(time: number): void {
    if (this.status === "won" || this.status === "lost") {
      this.player.setVelocity(0, 0);
      this.enemies.children.iterate((child) => {
        const enemy = child as Phaser.Physics.Arcade.Sprite;
        enemy.setVelocity(0, 0);
        return true;
      });
      return;
    }

    const speed = this.config.player.speed;
    let vx = 0;
    let vy = 0;
    if (this.cursors.left.isDown || this.wasd.left.isDown) vx -= 1;
    if (this.cursors.right.isDown || this.wasd.right.isDown) vx += 1;
    if (this.cursors.up.isDown || this.wasd.up.isDown) vy -= 1;
    if (this.cursors.down.isDown || this.wasd.down.isDown) vy += 1;

    if (vx !== 0 || vy !== 0) {
      const vector = new Phaser.Math.Vector2(vx, vy).normalize().scale(speed);
      this.player.setVelocity(vector.x, vector.y);
    } else {
      this.player.setVelocity(0, 0);
    }

    this.enemies.children.iterate((child) => {
      const enemy = child as Phaser.Physics.Arcade.Sprite;
      const enemySpeed = Number(enemy.getData("speed"));
      const angle = Phaser.Math.Angle.Between(
        enemy.x,
        enemy.y,
        this.player.x,
        this.player.y,
      );
      this.physics.velocityFromRotation(angle, enemySpeed, enemy.body?.velocity);
      return true;
    });

    if (time < this.invulnerableUntil) {
      this.player.setAlpha(0.45 + 0.55 * Math.sin(time / 50));
    } else {
      this.player.setAlpha(1);
    }
  }

  private collectPickup: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (
    _player,
    pickupObj,
  ) => {
    if (this.status === "won" || this.status === "lost") return;
    const pickup = pickupObj as Phaser.Physics.Arcade.Sprite;
    pickup.destroy();
    this.collected += 1;
    this.cameras.main.flash(120, 94, 234, 212);
    if (
      this.status === "playing" &&
      this.collected >= this.config.win.requiredPickups
    ) {
      this.status = "unlocked";
      this.exit.setTexture("exit-open");
      this.tweens.add({
        targets: this.exit,
        scale: 1.12,
        duration: 280,
        yoyo: true,
        repeat: -1,
      });
    }
    this.emitHud();
  };

  private hitEnemy: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (
    _player,
    enemyObj,
  ) => {
    const enemy = enemyObj as Phaser.Physics.Arcade.Sprite;
    this.applyDamage(Number(enemy.getData("damage")));
  };

  private hitHazard: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (
    _player,
    hazardObj,
  ) => {
    const hazard = hazardObj as Phaser.Physics.Arcade.Sprite;
    this.applyDamage(Number(hazard.getData("damage")));
  };

  private tryExit: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = () => {
    if (this.status !== "unlocked") return;
    this.status = "won";
    this.player.setVelocity(0, 0);
    this.showBanner("You escaped", this.config.palette.exitOpen);
    this.emitHud();
  };

  private applyDamage(amount: number): void {
    if (this.status === "won" || this.status === "lost") return;
    if (this.time.now < this.invulnerableUntil) return;

    this.health = Math.max(0, this.health - amount);
    this.invulnerableUntil = this.time.now + 750;
    this.cameras.main.shake(160, 0.006);
    this.cameras.main.flash(80, 251, 113, 133);
    if (this.health <= 0) {
      this.status = "lost";
      this.player.setTint(0x64748b);
      this.showBanner("You were caught", this.config.palette.enemy);
    }
    this.emitHud();
  }

  private showBanner(text: string, color: string): void {
    this.overlay?.destroy();
    const width = this.scale.width;
    const height = this.scale.height;
    const background = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.55);
    const label = this.add
      .text(width / 2, height / 2, text, {
        fontFamily: "IBM Plex Sans, Segoe UI, sans-serif",
        fontSize: "36px",
        color,
        fontStyle: "700",
      })
      .setOrigin(0.5);
    this.overlay = this.add.container(0, 0, [background, label]).setDepth(20);
  }

  private emitHud(): void {
    const state: GameHudState = {
      title: this.config.title,
      objective: this.config.objective,
      controls: this.config.controls,
      health: this.health,
      maxHealth: this.config.player.health,
      collected: this.collected,
      required: this.config.win.requiredPickups,
      status: this.status,
    };
    this.onHud(state);
  }

  private drawMap(): void {
    const { map, tileSize, palette } = this.config;
    const gfx = this.add.graphics();
    for (let y = 0; y < map.length; y += 1) {
      for (let x = 0; x < map[y].length; x += 1) {
        const px = x * tileSize;
        const py = y * tileSize;
        if (map[y][x] === 1) {
          gfx.fillStyle(hex(palette.wall), 1);
          gfx.fillRoundedRect(px + 1, py + 1, tileSize - 2, tileSize - 2, 4);
          gfx.lineStyle(1, hex(palette.wallEdge), 0.35);
          gfx.strokeRoundedRect(px + 1, py + 1, tileSize - 2, tileSize - 2, 4);
        } else {
          const floor = (x + y) % 2 === 0 ? palette.floor : palette.floorAlt;
          gfx.fillStyle(hex(floor), 1);
          gfx.fillRect(px, py, tileSize, tileSize);
        }
      }
    }
  }

  private createTextures(): void {
    const { palette } = this.config;
    this.makeCircleTexture("player", palette.player, "#ffffff");
    this.makeTriangleTexture("enemy", palette.enemy);
    this.makeDiamondTexture("pickup", palette.pickup);
    this.makeHazardTexture("hazard", palette.hazard);
    this.makeExitTexture("exit-locked", palette.exitLocked);
    this.makeExitTexture("exit-open", palette.exitOpen);
    const wall = this.scratchGraphics();
    wall.fillStyle(0xffffff, 0);
    wall.fillRect(0, 0, this.config.tileSize, this.config.tileSize);
    wall.generateTexture("wall-body", this.config.tileSize, this.config.tileSize);
    wall.destroy();
  }

  private makeCircleTexture(key: string, fill: string, core: string): void {
    const g = this.scratchGraphics();
    g.fillStyle(hex(fill), 1);
    g.fillCircle(16, 16, 13);
    g.fillStyle(hex(core), 0.85);
    g.fillCircle(16, 16, 5);
    g.generateTexture(key, 32, 32);
    g.destroy();
  }

  private scratchGraphics(): Phaser.GameObjects.Graphics {
    return this.make.graphics({}, false);
  }

  private makeTriangleTexture(key: string, fill: string): void {
    const g = this.scratchGraphics();
    g.fillStyle(hex(fill), 1);
    g.fillTriangle(16, 3, 29, 28, 3, 28);
    g.generateTexture(key, 32, 32);
    g.destroy();
  }

  private makeDiamondTexture(key: string, fill: string): void {
    const g = this.scratchGraphics();
    g.fillStyle(hex(fill), 1);
    g.fillTriangle(16, 3, 28, 16, 16, 29);
    g.fillTriangle(16, 3, 4, 16, 16, 29);
    g.generateTexture(key, 32, 32);
    g.destroy();
  }

  private makeHazardTexture(key: string, fill: string): void {
    const g = this.scratchGraphics();
    g.fillStyle(hex(fill), 0.9);
    g.fillRoundedRect(4, 4, 24, 24, 4);
    g.lineStyle(2, 0xffffff, 0.4);
    g.strokeRoundedRect(4, 4, 24, 24, 4);
    g.generateTexture(key, 32, 32);
    g.destroy();
  }

  private makeExitTexture(key: string, fill: string): void {
    const g = this.scratchGraphics();
    g.lineStyle(3, hex(fill), 1);
    g.strokeRoundedRect(4, 4, 24, 24, 6);
    g.fillStyle(hex(fill), 0.28);
    g.fillRoundedRect(4, 4, 24, 24, 6);
    g.generateTexture(key, 32, 32);
    g.destroy();
  }
}
