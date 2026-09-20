/**
 * Tools and Weapons Registry for GameForge.
 * Centralizes tool tiers (0-4), mining speeds, harvest capabilities,
 * specialized utility items (axe, hammer, grapple), and weapon profiles (guns, melee, magic).
 */

export interface ToolProfile {
  id: string;
  name: string;
  tier: number; // 0=starter, 1=copper, 2=iron/resonant, 3=cobalt, 4=aether
  mineSpeedMultiplier: number;
  maxHarvestTier: number; // Highest material tier this tool can mine efficiently
  reachTiles: number; // Interaction reach in tiles
  specialBonus?: 'woodcutting' | 'demolition' | 'mobility';
}

export const TOOL_TIERS: Record<string, ToolProfile> = {
  pickaxe: {
    id: 'pickaxe',
    name: 'Field pickaxe',
    tier: 0,
    mineSpeedMultiplier: 1.0,
    maxHarvestTier: 1,
    reachTiles: 5,
  },
  pickaxe_copper: {
    id: 'pickaxe_copper',
    name: 'Copper pickaxe',
    tier: 1,
    mineSpeedMultiplier: 1.35,
    maxHarvestTier: 2,
    reachTiles: 5.5,
  },
  drill: {
    id: 'drill',
    name: 'Resonant pickaxe',
    tier: 2,
    mineSpeedMultiplier: 2.0,
    maxHarvestTier: 3,
    reachTiles: 6,
  },
  pickaxe_iron: {
    id: 'pickaxe_iron',
    name: 'Iron pickaxe',
    tier: 2,
    mineSpeedMultiplier: 1.8,
    maxHarvestTier: 3,
    reachTiles: 6,
  },
  pickaxe_cobalt: {
    id: 'pickaxe_cobalt',
    name: 'Cobalt pickaxe',
    tier: 3,
    mineSpeedMultiplier: 2.75,
    maxHarvestTier: 4,
    reachTiles: 6.5,
  },
  pickaxe_aether: {
    id: 'pickaxe_aether',
    name: 'Aether pickaxe',
    tier: 4,
    mineSpeedMultiplier: 3.75,
    maxHarvestTier: 4,
    reachTiles: 7,
  },
  axe_wood: {
    id: 'axe_wood',
    name: 'Timber axe',
    tier: 1,
    mineSpeedMultiplier: 1.2,
    maxHarvestTier: 1,
    reachTiles: 5,
    specialBonus: 'woodcutting',
  },
  hammer_construction: {
    id: 'hammer_construction',
    name: 'Builder hammer',
    tier: 1,
    mineSpeedMultiplier: 1.5,
    maxHarvestTier: 2,
    reachTiles: 6,
    specialBonus: 'demolition',
  },
  grapple_hook: {
    id: 'grapple_hook',
    name: 'Grapple hook',
    tier: 2,
    mineSpeedMultiplier: 1.0,
    maxHarvestTier: 0,
    reachTiles: 12,
    specialBonus: 'mobility',
  },
};

export type WeaponType = 'gun' | 'melee' | 'magic';

export interface WeaponStats {
  cooldown: number; // Milliseconds between attacks
  damage: number; // Base damage
  speed: number; // Projectile speed (0 for melee)
  mana: number; // Mana cost per activation
  type?: WeaponType;
  range?: number; // Melee swing reach or projectile max distance
  knockback?: number; // Knockback force applied to targets
  pellets?: number; // Number of projectiles per shot
  spread?: number; // Spread angle in radians
  pierce?: number; // How many targets a projectile can pierce through
  statusEffect?: {
    type: 'burning' | 'slowing' | 'poison';
    durationMs: number;
    magnitude: number;
  };
}

/**
 * Central WEAPONS table. Preserves legacy blaster, carbine, staff, sword definitions
 * while adding new ranged, melee, and magic archetypes.
 */
export const WEAPONS: Record<string, WeaponStats> = {
  // --- Legacy Weapons (Preserved Exact Stats) ---
  blaster: {
    cooldown: 260,
    damage: 18,
    speed: 600,
    mana: 0,
    type: 'gun',
    knockback: 60,
  },
  carbine: {
    cooldown: 170,
    damage: 26,
    speed: 700,
    mana: 0,
    type: 'gun',
    knockback: 75,
  },
  staff: {
    cooldown: 600,
    damage: 44,
    speed: 370,
    mana: 15,
    type: 'magic',
    knockback: 100,
  },
  sword: {
    cooldown: 430,
    damage: 32,
    speed: 0,
    mana: 0,
    type: 'melee',
    range: 52,
    knockback: 120,
  },

  // --- Expanded Weapons ---
  blaster_burst: {
    cooldown: 480,
    damage: 20,
    speed: 650,
    mana: 0,
    type: 'gun',
    pellets: 3,
    spread: 0.08,
    knockback: 65,
  },
  blaster_scatter: {
    cooldown: 520,
    damage: 14, // Per pellet
    speed: 550,
    mana: 0,
    type: 'gun',
    pellets: 5,
    spread: 0.28,
    knockback: 130,
  },
  rifle_rail: {
    cooldown: 850,
    damage: 75,
    speed: 1200,
    mana: 0,
    type: 'gun',
    pierce: 3,
    knockback: 180,
  },
  sword_long: {
    cooldown: 520,
    damage: 48,
    speed: 0,
    mana: 0,
    type: 'melee',
    range: 68,
    knockback: 150,
  },
  spear: {
    cooldown: 380,
    damage: 36,
    speed: 0,
    mana: 0,
    type: 'melee',
    range: 82,
    knockback: 90,
  },
  hammer_heavy: {
    cooldown: 720,
    damage: 68,
    speed: 0,
    mana: 0,
    type: 'melee',
    range: 58,
    knockback: 260,
  },
  staff_ember: {
    cooldown: 550,
    damage: 50,
    speed: 400,
    mana: 18,
    type: 'magic',
    knockback: 90,
    statusEffect: {
      type: 'burning',
      durationMs: 3000,
      magnitude: 6,
    },
  },
  wand_frost: {
    cooldown: 340,
    damage: 28,
    speed: 460,
    mana: 10,
    type: 'magic',
    knockback: 50,
    statusEffect: {
      type: 'slowing',
      durationMs: 2500,
      magnitude: 0.45,
    },
  },
  staff_arc: {
    cooldown: 420,
    damage: 38,
    speed: 580,
    mana: 16,
    type: 'magic',
    pierce: 2,
    knockback: 80,
  },
  tome_crystal: {
    cooldown: 650,
    damage: 56,
    speed: 350,
    mana: 22,
    type: 'magic',
    knockback: 110,
  },
};

/** Get tool profile or fallback to starter pickaxe if tool */
export function getToolProfile(id: string): ToolProfile | undefined {
  return TOOL_TIERS[id];
}

/** Get weapon stats or undefined if not a registered weapon */
export function getWeaponStats(id: string): WeaponStats | undefined {
  return WEAPONS[id];
}
