import { ENEMY_REWARDS } from './economy';
/**
 * Hostile Enemies and Variant Registry for GameForge.
 * Preserves the 6 base archetypes while expanding with biome variants,
 * elite affixes, collision parameters, and loot drop tables.
 * Complies with the Data-Driven "Bouncer" architecture.
 */

import type { ItemId } from './items';

export interface EnemyCollider {
  width: number;
  height: number;
  offsetX?: number;
  offsetY?: number;
  isTrigger?: boolean;
}

export interface EnemyLootDrop {
  item: ItemId;
  chance: number; // 0.0 to 1.0
  min: number;
  max: number;
}

export interface EnemyStats {
  id?: string;
  name?: string;
  texture: string;
  hp: number;
  damage: number;
  speed: number;
  range: number;
  reward: number; // Coins awarded on defeat
  scale?: number;
  hitbox?: { width: number; height: number };
  collider?: EnemyCollider;
  baseClass?: string;
  baseType?: string;
  logicController?: string;
  mass?: number;
  hasCollider?: boolean;
  attackPattern?: any;
  attackCooldownMs?: number;
  projectileSpeed?: number;
  flying?: boolean;
  biomeAffinity?: string;
  drops?: EnemyLootDrop[];
}

/**
 * Base Archetype Enemies (preserving original 6 IDs & core stats).
 */
export const BASE_ENEMIES: Record<string, EnemyStats> = {
  crawler: {
    name: 'Frontier Crawler',
    texture: 'walker',
    hp: 50,
    damage: 10,
    speed: 55,
    range: 260,
    reward: 12,
    baseClass: 'BaseGroundEnemy',
    hitbox: { width: 22, height: 18 },
    collider: { width: 20, height: 16 },
    hasCollider: true,
    mass: 1.0,
    drops: [
      { item: 'meat_raw', chance: 0.5, min: 1, max: 1 },
      { item: 'scrap', chance: 0.25, min: 1, max: 2 },
    ],
  },
  hopper: {
    name: 'Cavern Hopper',
    texture: 'hopper',
    hp: 42,
    damage: 12,
    speed: 90,
    range: 250,
    reward: 10,
    baseClass: 'BaseGroundEnemy',
    hitbox: { width: 18, height: 20 },
    collider: { width: 16, height: 18 },
    hasCollider: true,
    mass: 0.8,
    drops: [
      { item: 'meat_raw', chance: 0.4, min: 1, max: 1 },
      { item: 'stone', chance: 0.3, min: 1, max: 2 },
    ],
  },
  drone: {
    name: 'Patrol Drone',
    texture: 'drone',
    hp: 45,
    damage: 10,
    speed: 75,
    range: 320,
    reward: 15,
    baseClass: 'BaseFlyingEnemy',
    hitbox: { width: 20, height: 16 },
    collider: { width: 18, height: 14 },
    hasCollider: true,
    flying: true,
    mass: 0.6,
    drops: [
      { item: 'scrap', chance: 0.7, min: 1, max: 3 },
      { item: 'copper_ore', chance: 0.3, min: 1, max: 2 },
    ],
  },
  gunner: {
    name: 'Automaton Gunner',
    texture: 'gunner',
    hp: 70,
    damage: 14,
    speed: 55,
    range: 400,
    reward: 20,
    baseClass: 'BaseRangedEnemy',
    hitbox: { width: 22, height: 26 },
    collider: { width: 20, height: 24 },
    hasCollider: true,
    attackCooldownMs: 1400,
    projectileSpeed: 380,
    mass: 1.2,
    drops: [
      { item: 'scrap', chance: 0.8, min: 2, max: 4 },
      { item: 'iron', chance: 0.4, min: 1, max: 2 },
    ],
  },
  caster: {
    name: 'Prism Caster',
    texture: 'caster',
    hp: 65,
    damage: 16,
    speed: 45,
    range: 370,
    reward: 22,
    baseClass: 'BaseRangedEnemy',
    hitbox: { width: 20, height: 28 },
    collider: { width: 18, height: 26 },
    hasCollider: true,
    attackCooldownMs: 1800,
    projectileSpeed: 320,
    mass: 1.0,
    drops: [
      { item: 'crystal', chance: 0.8, min: 1, max: 3 },
      { item: 'silver_ore', chance: 0.3, min: 1, max: 1 },
    ],
  },
  sentinel: {
    name: 'Heavy Bastion Sentinel',
    texture: 'sentinel',
    hp: 130,
    damage: 22,
    speed: 35,
    range: 260,
    reward: 32,
    baseClass: 'BaseHeavyEnemy',
    hitbox: { width: 32, height: 38 },
    collider: { width: 28, height: 36 },
    hasCollider: true,
    scale: 1.25,
    mass: 2.5,
    drops: [
      { item: 'bar', chance: 0.5, min: 1, max: 2 },
      { item: 'scrap', chance: 0.9, min: 3, max: 5 },
      { item: 'gold_ore', chance: 0.25, min: 1, max: 2 },
    ],
  },
  bomber: {
    name: 'Volatile Bomber',
    texture: 'bomber',
    hp: 55,
    damage: 18,
    speed: 52,
    range: 240,
    reward: 28,
    baseClass: 'BaseGroundEnemy',
    hitbox: { width: 24, height: 28 },
    collider: { width: 22, height: 26 },
    hasCollider: true,
    mass: 1.1,
    drops: [
      { item: 'coal', chance: 0.6, min: 1, max: 3 },
      { item: 'scrap', chance: 0.5, min: 1, max: 2 },
    ],
  },
  explosion_bot: {
    name: 'Explosion Bot',
    texture: 'explosion_bot',
    hp: 40,
    damage: 60,
    speed: 88,
    range: 420,
    reward: 35,
    baseClass: 'BaseGroundEnemy',
    logicController: 'SuicideBomber',
    hitbox: { width: 26, height: 28 },
    collider: { width: 24, height: 26 },
    hasCollider: true,
    mass: 1.2,
    drops: [
      { item: 'scrap', chance: 0.9, min: 2, max: 4 },
      { item: 'coal', chance: 0.7, min: 1, max: 3 },
    ],
  },
  brute: {
    name: 'Ashen Brute',
    texture: 'brute',
    hp: 110,
    damage: 20,
    speed: 38,
    range: 220,
    reward: 26,
    baseClass: 'BaseGroundEnemy',
    baseType: 'sentinel',
    logicController: 'AggressiveBoss',
    hitbox: { width: 30, height: 36 },
    collider: { width: 28, height: 34 },
    hasCollider: true,
    scale: 1.15,
    mass: 2.2,
    drops: [
      { item: 'scrap', chance: 0.8, min: 2, max: 4 },
      { item: 'iron', chance: 0.35, min: 1, max: 2 },
    ],
  },
  stalker: {
    name: 'Night Stalker',
    texture: 'stalker',
    hp: 48,
    damage: 14,
    speed: 110,
    range: 300,
    reward: 18,
    baseClass: 'BaseGroundEnemy',
    baseType: 'crawler',
    hitbox: { width: 24, height: 20 },
    collider: { width: 22, height: 18 },
    hasCollider: true,
    mass: 0.7,
    drops: [
      { item: 'meat_raw', chance: 0.55, min: 1, max: 2 },
      { item: 'scrap', chance: 0.3, min: 1, max: 1 },
    ],
  },
  spitter: {
    name: 'Venom Spitter',
    texture: 'spitter',
    hp: 58,
    damage: 12,
    speed: 48,
    range: 380,
    reward: 20,
    baseClass: 'BaseRangedEnemy',
    baseType: 'gunner',
    attackCooldownMs: 1200,
    projectileSpeed: 300,
    hitbox: { width: 22, height: 24 },
    collider: { width: 20, height: 22 },
    hasCollider: true,
    mass: 1.0,
    drops: [
      { item: 'herb', chance: 0.5, min: 1, max: 2 },
      { item: 'crystal', chance: 0.2, min: 1, max: 1 },
    ],
  },
  grub: {
    name: 'Armored Grub',
    texture: 'grub',
    hp: 95,
    damage: 11,
    speed: 32,
    range: 200,
    reward: 16,
    baseClass: 'BaseGroundEnemy',
    baseType: 'crawler',
    hitbox: { width: 28, height: 16 },
    collider: { width: 26, height: 14 },
    hasCollider: true,
    mass: 1.8,
    drops: [
      { item: 'stone', chance: 0.6, min: 1, max: 3 },
      { item: 'coal', chance: 0.35, min: 1, max: 2 },
    ],
  },
  thornback: {
    name: 'Thornback',
    texture: 'thornback',
    hp: 70,
    damage: 16,
    speed: 70,
    range: 260,
    reward: 22,
    baseClass: 'BaseGroundEnemy',
    baseType: 'hopper',
    hitbox: { width: 24, height: 22 },
    collider: { width: 22, height: 20 },
    hasCollider: true,
    mass: 1.1,
    drops: [
      { item: 'herb', chance: 0.45, min: 1, max: 2 },
      { item: 'meat_raw', chance: 0.4, min: 1, max: 1 },
    ],
  },
  rockmite: {
    name: 'Rockmite',
    texture: 'rockmite',
    hp: 36,
    damage: 8,
    speed: 65,
    range: 220,
    reward: 10,
    baseClass: 'BaseGroundEnemy',
    baseType: 'crawler',
    hitbox: { width: 16, height: 14 },
    collider: { width: 14, height: 12 },
    hasCollider: true,
    mass: 0.5,
    drops: [
      { item: 'stone', chance: 0.7, min: 1, max: 2 },
      { item: 'copper_ore', chance: 0.25, min: 1, max: 1 },
    ],
  },
  wisp: {
    name: 'Aether Wisp',
    texture: 'wisp',
    hp: 28,
    damage: 9,
    speed: 100,
    range: 340,
    reward: 14,
    baseClass: 'BaseFlyingEnemy',
    flying: true,
    hitbox: { width: 18, height: 18 },
    collider: { width: 16, height: 16 },
    hasCollider: true,
    mass: 0.4,
    drops: [
      { item: 'crystal', chance: 0.35, min: 1, max: 1 },
    ],
  },
  skimmer: {
    name: 'Void Skimmer',
    texture: 'skimmer',
    hp: 38,
    damage: 13,
    speed: 115,
    range: 380,
    reward: 18,
    baseClass: 'BaseFlyingEnemy',
    flying: true,
    logicController: 'HoverAndStrafe',
    hitbox: { width: 30, height: 16 },
    collider: { width: 28, height: 14 },
    hasCollider: true,
    mass: 0.5,
    drops: [
      { item: 'scrap', chance: 0.55, min: 1, max: 2 },
    ],
  },
  dart_wisp: {
    name: 'Dart Wisp',
    texture: 'dart_wisp',
    hp: 34,
    damage: 11,
    speed: 108,
    range: 420,
    reward: 16,
    baseClass: 'BaseFlyingEnemy',
    baseType: 'gunner',
    flying: true,
    logicController: 'HoverAndStrafe',
    attackCooldownMs: 1100,
    projectileSpeed: 340,
    hitbox: { width: 20, height: 20 },
    collider: { width: 18, height: 18 },
    hasCollider: true,
    mass: 0.4,
    drops: [{ item: 'crystal', chance: 0.4, min: 1, max: 1 }],
  },
  sky_gunner: {
    name: 'Sky Gunner',
    texture: 'sky_gunner',
    hp: 52,
    damage: 13,
    speed: 86,
    range: 460,
    reward: 20,
    baseClass: 'BaseFlyingEnemy',
    baseType: 'gunner',
    flying: true,
    logicController: 'HoverAndStrafe',
    attackCooldownMs: 900,
    projectileSpeed: 400,
    hitbox: { width: 26, height: 22 },
    collider: { width: 24, height: 20 },
    hasCollider: true,
    mass: 0.7,
    drops: [{ item: 'scrap', chance: 0.65, min: 1, max: 2 }],
  },
  razorwing: {
    name: 'Razorwing',
    texture: 'razorwing',
    hp: 44,
    damage: 15,
    speed: 124,
    range: 400,
    reward: 18,
    baseClass: 'BaseFlyingEnemy',
    baseType: 'gunner',
    flying: true,
    attackCooldownMs: 800,
    projectileSpeed: 360,
    hitbox: { width: 32, height: 18 },
    collider: { width: 30, height: 16 },
    hasCollider: true,
    mass: 0.5,
    drops: [{ item: 'herb', chance: 0.35, min: 1, max: 1 }],
  },
};

/** Flying enemy ids used for aerial spawn slots. */
export const FLYING: ReadonlySet<string> = new Set(['drone', 'wisp', 'skimmer', 'dart_wisp', 'sky_gunner', 'razorwing']);

/**
 * Compatible export mapping directly to legacy ENEMIES constant.
 */
export const ENEMIES: Record<string, EnemyStats> = { ...BASE_ENEMIES };

// ==========================================
// --- Biome Enemy Variants ---
// ==========================================
export const BIOME_VARIANTS: Record<string, EnemyStats> = {
  // Verdant frontier
  crawler_verdant: {
    ...BASE_ENEMIES.crawler,
    name: 'Moss Crawler',
    hp: 55,
    damage: 11,
    biomeAffinity: 'Verdant frontier',
    drops: [
      { item: 'herb', chance: 0.6, min: 1, max: 2 },
      { item: 'meat_raw', chance: 0.5, min: 1, max: 1 },
    ],
  },
  drone_verdant: {
    ...BASE_ENEMIES.drone,
    name: 'Pollen Scout',
    hp: 40,
    speed: 82,
    biomeAffinity: 'Verdant frontier',
  },

  // Rust wastes
  crawler_rust: {
    ...BASE_ENEMIES.crawler,
    name: 'Scrap Scavenger',
    hp: 65,
    damage: 13,
    reward: 16,
    biomeAffinity: 'Rust wastes',
    drops: [
      { item: 'scrap', chance: 0.85, min: 2, max: 4 },
      { item: 'iron', chance: 0.35, min: 1, max: 2 },
    ],
  },
  gunner_rust: {
    ...BASE_ENEMIES.gunner,
    name: 'Wasteland Gunner',
    hp: 85,
    damage: 16,
    reward: 25,
    biomeAffinity: 'Rust wastes',
  },

  // Frost highlands
  crawler_frost: {
    ...BASE_ENEMIES.crawler,
    name: 'Glacial Crawler',
    hp: 70,
    damage: 14,
    speed: 48,
    reward: 18,
    biomeAffinity: 'Frost highlands',
  },
  hopper_frost: {
    ...BASE_ENEMIES.hopper,
    name: 'Ice Skimmer',
    hp: 55,
    speed: 100,
    damage: 15,
    reward: 16,
    biomeAffinity: 'Frost highlands',
  },

  // Fungal hollows
  crawler_fungal: {
    ...BASE_ENEMIES.crawler,
    name: 'Spore Borer',
    hp: 60,
    damage: 12,
    biomeAffinity: 'Fungal hollows',
    drops: [
      { item: 'mushroom_edible', chance: 0.8, min: 1, max: 3 },
      { item: 'meat_raw', chance: 0.4, min: 1, max: 1 },
    ],
  },
  caster_fungal: {
    ...BASE_ENEMIES.caster,
    name: 'Spore Shaman',
    hp: 80,
    damage: 18,
    reward: 28,
    biomeAffinity: 'Fungal hollows',
  },

  // Crystal depths
  drone_crystal: {
    ...BASE_ENEMIES.drone,
    name: 'Prism Skimmer',
    hp: 75,
    damage: 16,
    speed: 85,
    reward: 24,
    biomeAffinity: 'Crystal depths',
    drops: [
      { item: 'crystal', chance: 0.9, min: 2, max: 4 },
      { item: 'silver_ore', chance: 0.4, min: 1, max: 2 },
    ],
  },
  sentinel_crystal: {
    ...BASE_ENEMIES.sentinel,
    name: 'Amethyst Warder',
    hp: 180,
    damage: 28,
    reward: 45,
    biomeAffinity: 'Crystal depths',
  },

  // Ashen depths
  crawler_ashen: {
    ...BASE_ENEMIES.crawler,
    name: 'Magma Borer',
    hp: 110,
    damage: 24,
    reward: 30,
    biomeAffinity: 'Ashen depths',
    drops: [
      { item: 'coal', chance: 0.8, min: 2, max: 4 },
      { item: 'obsidian', chance: 0.5, min: 1, max: 2 },
    ],
  },
  gunner_ashen: {
    ...BASE_ENEMIES.gunner,
    name: 'Magma Blaster',
    hp: 130,
    damage: 26,
    reward: 38,
    biomeAffinity: 'Ashen depths',
  },
};

// ==========================================
// --- Elite Affixes & Modifiers ---
// ==========================================
export interface EliteModifier {
  prefix: string;
  colorTint: string;
  hpMultiplier: number;
  damageMultiplier: number;
  speedMultiplier: number;
  coinMultiplier: number;
  specialTrait: 'speed' | 'defense' | 'fire' | 'explosion' | 'leech';
}

export const ELITE_MODIFIERS: Record<string, EliteModifier> = {
  swift: {
    prefix: 'Swift',
    colorTint: '#fffa65',
    hpMultiplier: 1.1,
    damageMultiplier: 1.15,
    speedMultiplier: 1.45,
    coinMultiplier: 1.8,
    specialTrait: 'speed',
  },
  armored: {
    prefix: 'Armored',
    colorTint: '#95a5a6',
    hpMultiplier: 2.0,
    damageMultiplier: 1.2,
    speedMultiplier: 0.85,
    coinMultiplier: 2.2,
    specialTrait: 'defense',
  },
  fiery: {
    prefix: 'Fiery',
    colorTint: '#e67e22',
    hpMultiplier: 1.25,
    damageMultiplier: 1.4,
    speedMultiplier: 1.1,
    coinMultiplier: 2.0,
    specialTrait: 'fire',
  },
  volatile: {
    prefix: 'Volatile',
    colorTint: '#9b59b6',
    hpMultiplier: 0.9,
    damageMultiplier: 1.5,
    speedMultiplier: 1.25,
    coinMultiplier: 2.5,
    specialTrait: 'explosion',
  },
  vampiric: {
    prefix: 'Vampiric',
    colorTint: '#c0392b',
    hpMultiplier: 1.35,
    damageMultiplier: 1.25,
    speedMultiplier: 1.05,
    coinMultiplier: 2.4,
    specialTrait: 'leech',
  },
};

/** Get enemy specification by key */
export function getEnemySpec(key: string): EnemyStats | undefined {
  return BIOME_VARIANTS[key] || BASE_ENEMIES[key] || ENEMIES[key];
}

// Stable variant IDs share archetype controllers, with distinct attacks, contact effects and drops.
for (const [id, spec] of Object.entries(BIOME_VARIANTS)) {
  const baseType = id.split('_')[0];
  ENEMIES[id] = { ...spec, baseType, texture: id, speed: spec.speed * (id.includes('frost') ? 1.15 : 1), reward: ['caster','sentinel','gunner'].includes(baseType) ? ENEMY_REWARDS.strong : ENEMY_REWARDS.ordinary };
}
for (const id of Object.keys(BASE_ENEMIES)) {
  const e = ENEMIES[id];
  const key = e.baseType ?? id;
  if (['caster', 'sentinel', 'gunner'].includes(id) || ['caster', 'sentinel', 'gunner'].includes(key))
    e.reward = ENEMY_REWARDS.strong;
  else if (['crawler', 'hopper', 'drone', 'bomber', 'explosion_bot', 'wisp', 'skimmer'].includes(id))
    e.reward = ENEMY_REWARDS.ordinary;
  // else keep explicit reward from BASE_ENEMIES (new land foes, etc.)
}
