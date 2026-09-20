import { BOSS_REWARDS } from './economy';
/**
 * Multi-Phase Boss Registry for GameForge.
 * Defines the 3 core bosses (Rust Colossus, Mycelial Sovereign, Aether Warden),
 * their phase transitions, telegraph markers, attack choreography, arenas, and drop tables.
 * Complies strictly with the Data-Driven "Bouncer" architecture.
 */

import type { ItemId } from './items';

export interface BossPhase {
  phaseNumber: number;
  triggerHpPercent: number; // e.g. 0.50 triggers when HP drops below 50%
  name: string;
  speedMultiplier: number;
  attackIntervalMs: number;
  telegraphDurationMs: number;
  attacks: {
    name: string;
    description: string;
    damage: number;
    range: number;
    cooldownMs: number;
    telegraphColor: string;
  }[];
}

export interface BossDefinition {
  id: string;
  name: string;
  title: string;
  baseClass: 'BaseGroundBoss' | 'BaseFlyingBoss';
  maxHp: number;
  damage: number;
  speed: number;
  coinReward: number;
  biome: string;
  hitbox: { width: number; height: number };
  collider: { width: number; height: number; offsetX?: number; offsetY?: number };
  musicTheme?: string;
  phases: BossPhase[];
  lootTable: {
    item: ItemId;
    guaranteedCount: number;
    bonusChance: number;
    bonusCount: number;
  }[];
}

export const BOSS_REGISTRY: Record<string, BossDefinition> = {
  rust_colossus: {
    id: 'rust_colossus',
    name: 'Rust Colossus',
    title: 'Titan of the Scrap Heap',
    baseClass: 'BaseGroundBoss',
    maxHp: 800,
    damage: 28,
    speed: 38,
    coinReward: 90,
    biome: 'Rust wastes',
    hitbox: { width: 56, height: 64 },
    collider: { width: 48, height: 60 },
    phases: [
      {
        phaseNumber: 1,
        triggerHpPercent: 1.0,
        name: 'Stomp & Mortar',
        speedMultiplier: 1.0,
        attackIntervalMs: 2500,
        telegraphDurationMs: 800,
        attacks: [
          {
            name: 'Earthquake Stomp',
            description: 'Slams the ground sending dual shockwaves left and right.',
            damage: 24,
            range: 300,
            cooldownMs: 3000,
            telegraphColor: '#e67e22',
          },
          {
            name: 'Scrap Cluster Bomb',
            description: 'Launches 3 explosive scrap shells in a high arc.',
            damage: 20,
            range: 450,
            cooldownMs: 5000,
            telegraphColor: '#d35400',
          },
        ],
      },
      {
        phaseNumber: 2,
        triggerHpPercent: 0.5,
        name: 'Steam Overdrive',
        speedMultiplier: 1.4,
        attackIntervalMs: 1800,
        telegraphDurationMs: 500,
        attacks: [
          {
            name: 'Overheat Rocket Charge',
            description: 'Vents high-pressure steam and charges across the arena floor.',
            damage: 36,
            range: 400,
            cooldownMs: 4000,
            telegraphColor: '#c0392b',
          },
          {
            name: 'Piston Laser Barrage',
            description: 'Rapid-fires piercing laser pulses horizontally.',
            damage: 22,
            range: 600,
            cooldownMs: 3500,
            telegraphColor: '#e74c3c',
          },
        ],
      },
    ],
    lootTable: [
      { item: 'scrap', guaranteedCount: 12, bonusChance: 0.8, bonusCount: 6 },
      { item: 'bar', guaranteedCount: 6, bonusChance: 0.9, bonusCount: 4 },
      { item: 'copper_bar', guaranteedCount: 6, bonusChance: 0.75, bonusCount: 3 },
      { item: 'carbine', guaranteedCount: 1, bonusChance: 0.0, bonusCount: 0 },
    ],
  },

  mycelial_sovereign: {
    id: 'mycelial_sovereign',
    name: 'Mycelial Sovereign',
    title: 'The Deep Bloom',
    baseClass: 'BaseGroundBoss',
    maxHp: 1100,
    damage: 34,
    speed: 45,
    coinReward: 120,
    biome: 'Fungal hollows',
    hitbox: { width: 60, height: 60 },
    collider: { width: 52, height: 56 },
    phases: [
      {
        phaseNumber: 1,
        triggerHpPercent: 1.0,
        name: 'Spore Colony',
        speedMultiplier: 0.8,
        attackIntervalMs: 2200,
        telegraphDurationMs: 700,
        attacks: [
          {
            name: 'Homing Spore Cloud',
            description: 'Releases slow homing toxic spore orbs toward the player.',
            damage: 18,
            range: 500,
            cooldownMs: 2500,
            telegraphColor: '#2ecc71',
          },
          {
            name: 'Sporeling Brood',
            description: 'Summons 2 mini spore crawlers to harass.',
            damage: 10,
            range: 200,
            cooldownMs: 6000,
            telegraphColor: '#27ae60',
          },
        ],
      },
      {
        phaseNumber: 2,
        triggerHpPercent: 0.45,
        name: 'Uprooted Wrath',
        speedMultiplier: 1.6,
        attackIntervalMs: 1500,
        telegraphDurationMs: 450,
        attacks: [
          {
            name: 'Apex Canopy Leap',
            description: 'Leaps high into the air and crashes down with poisonous shockwaves.',
            damage: 42,
            range: 350,
            cooldownMs: 3500,
            telegraphColor: '#16a085',
          },
          {
            name: 'Ceiling Stalactite Spikes',
            description: 'Impales the ground causing fungal spikes to drop from above.',
            damage: 30,
            range: 450,
            cooldownMs: 4000,
            telegraphColor: '#1abc9c',
          },
        ],
      },
    ],
    lootTable: [
      { item: 'mushroom_edible', guaranteedCount: 10, bonusChance: 0.9, bonusCount: 6 },
      { item: 'herb', guaranteedCount: 8, bonusChance: 0.8, bonusCount: 4 },
      { item: 'vitality_core', guaranteedCount: 1, bonusChance: 0.5, bonusCount: 1 },
      { item: 'gold_ore', guaranteedCount: 4, bonusChance: 0.7, bonusCount: 3 },
    ],
  },

  aether_warden: {
    id: 'aether_warden',
    name: 'Aether Warden',
    title: 'Guardian of the Pinnacle Core',
    baseClass: 'BaseFlyingBoss',
    maxHp: 1500,
    damage: 42,
    speed: 70,
    coinReward: 150,
    biome: 'Crystal depths',
    hitbox: { width: 50, height: 68 },
    collider: { width: 44, height: 60 },
    phases: [
      {
        phaseNumber: 1,
        triggerHpPercent: 1.0,
        name: 'Prismatic Convergence',
        speedMultiplier: 1.0,
        attackIntervalMs: 2000,
        telegraphDurationMs: 600,
        attacks: [
          {
            name: 'Prismatic Beam',
            description: 'Sweeps a deadly continuous energy beam across the arena.',
            damage: 38,
            range: 700,
            cooldownMs: 4000,
            telegraphColor: '#9b59b6',
          },
          {
            name: 'Crystal Shard Volley',
            description: 'Fires 6 homing crystalline shards in rapid succession.',
            damage: 22,
            range: 600,
            cooldownMs: 3000,
            telegraphColor: '#8e44ad',
          },
        ],
      },
      {
        phaseNumber: 2,
        triggerHpPercent: 0.35,
        name: 'Celestial Singularity',
        speedMultiplier: 1.35,
        attackIntervalMs: 1300,
        telegraphDurationMs: 400,
        attacks: [
          {
            name: 'Gravity Surge',
            description: 'Distorts gravity, drawing player inward while detonating orbital flares.',
            damage: 48,
            range: 400,
            cooldownMs: 5000,
            telegraphColor: '#3498db',
          },
          {
            name: 'Supernova Cascade',
            description: 'Bursts into 360-degree star fire and teleports behind the target.',
            damage: 45,
            range: 500,
            cooldownMs: 4500,
            telegraphColor: '#00d2d3',
          },
        ],
      },
    ],
    lootTable: [
      { item: 'aether_crystal', guaranteedCount: 8, bonusChance: 0.9, bonusCount: 4 },
      { item: 'gold_bar', guaranteedCount: 6, bonusChance: 0.85, bonusCount: 3 },
      { item: 'cobalt_bar', guaranteedCount: 6, bonusChance: 0.85, bonusCount: 3 },
      { item: 'tome_crystal', guaranteedCount: 1, bonusChance: 0.0, bonusCount: 0 },
      { item: 'mana_core', guaranteedCount: 1, bonusChance: 0.7, bonusCount: 1 },
    ],
  },
};

/** Lookup boss by id */
export function getBossDefinition(id: string): BossDefinition | undefined {
  return BOSS_REGISTRY[id];
}

for(const [id,boss] of Object.entries(BOSS_REGISTRY)) boss.coinReward=BOSS_REWARDS[id];
