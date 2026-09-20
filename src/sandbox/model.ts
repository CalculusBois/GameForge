import { OBJECTIVE_REWARDS, CHEST_REWARD } from './registry/economy';
import type { WorldCreation } from '../creator/spec';
import {
  ITEMS,
  type ItemDefinition,
  type ItemId,
} from './registry/items';
import {
  RECIPES,
  SMELTING_RECIPES,
  SMELTING_FUELS,
  type Recipe,
  type SmeltingRecipe,
  type SmeltingFuel,
} from './registry/recipes';
import {
  SKINS,
  type SkinId,
} from './registry/cosmetics';
import {
  WEAPONS,
} from './registry/toolsAndWeapons';
import {
  FOOD_PROFILES,
  COOKING_RECIPES,
  getFoodProfile,
  type FoodProfile,
  type CookingRecipe,
} from './registry/foodAndCooking';
import {
  ANIMAL_REGISTRY,
  type AnimalDefinition,
  type AnimalBehavior,
} from './registry/animals';
import {
  BIOME_VARIANTS,
  ELITE_MODIFIERS,
  getEnemySpec,
  type EliteModifier,
} from './registry/enemies';

export const SAVE_VERSION = 2;
export const GENERATOR_VERSION = 2;
export const TILE = 24, CHUNK = 32, DEPTH = 160, WORLD_LIMIT = 120000;

export type Biome =
  | 'Verdant frontier'
  | 'Rust wastes'
  | 'Crystal depths'
  | 'Frost highlands'
  | 'Fungal hollows'
  | 'Ashen depths';

export type Material =
  | 0 // Air
  | 1 // Soil
  | 2 // Stone
  | 3 // Iron vein
  | 4 // Crystal vein
  | 5 // Scrap seam
  | 6 // Bedrock
  | 7 // Outpost block
  | 8 // Lumen torch
  | 9 // Frontier turf
  | 10 // Copper vein
  | 11 // Coal seam
  | 12 // Silver vein
  | 13 // Gold vein
  | 14 // Cobalt vein
  | 15 // Obsidian crust
  | 16 // Aether cluster
  | 17 // Wooden platform
  | 18 // Wooden wall
  | 19 // Stone wall
  | 20 // Storage crate
  | 21 // Rope
  | 22 // Ladder
  | 23 // Lava hazard pool
  | 24 // Timber door (closed)
  | 25 // Timber door (open)
  | 26 // Vitality Totem
  | 27 // Warding Totem
  | 28 // Prospector Totem
  | 29 // Arcane Totem
  | 30 // Crop seedling
  | 31 // Mature crop
  | 32 | 33 | 34 | 35 | 36 | 37 | 38 | 39 | 40 | 41 | 42;

export interface WorldSettings {
  seed: string;
  difficulty: 'explorer' | 'standard' | 'extreme' | 'boss';
  roughness: number;
  caves: number;
  abundance: number;
}

export const DEFAULT_WORLD: WorldSettings = {
  seed: 'LUMEN-01',
  difficulty: 'explorer',
  roughness: 1,
  caves: 1,
  abundance: 1,
};

export function validateSettings(s: WorldSettings) {
  if (
    !s ||
    typeof s.seed !== 'string' ||
    !s.seed.trim() ||
    s.seed.length > 80 ||
    !['explorer', 'standard', 'extreme', 'boss'].includes(s.difficulty) ||
    ![s.roughness, s.caves, s.abundance].every(
      (v) => Number.isFinite(v) && v >= 0.6 && v <= 1.4
    )
  )
    throw new Error('Choose a seed and supported world settings.');
}

// Items & Inventory
export type Item = ItemDefinition;
export type { ItemId };
export { ITEMS };

export interface Stack {
  id: ItemId;
  count: number;
}

export type Inventory = (Stack | null)[];

export const count = (inv: Inventory, id: ItemId) =>
  inv.reduce((n, s) => n + (s?.id === id ? s.count : 0), 0);

export function add(inv: Inventory, id: ItemId, amount: number): boolean {
  if (!Number.isInteger(amount) || amount < 1) return false;
  const itemDef = ITEMS[id];
  if (!itemDef) return false;
  const copy = structuredClone(inv);
  let left = amount;
  for (const s of copy) {
    if (s?.id === id) {
      const n = Math.min(itemDef.stack - s.count, left);
      s.count += n;
      left -= n;
    }
  }
  for (let i = 0; i < copy.length && left > 0; i++) {
    if (!copy[i]) {
      const n = Math.min(itemDef.stack, left);
      copy[i] = { id, count: n };
      left -= n;
    }
  }
  if (left) return false;
  inv.splice(0, inv.length, ...copy);
  return true;
}

export function remove(inv: Inventory, id: ItemId, amount: number): boolean {
  if (!Number.isInteger(amount) || amount < 1 || count(inv, id) < amount)
    return false;
  for (let i = 0; i < inv.length && amount > 0; i++) {
    const s = inv[i];
    if (s?.id === id) {
      const n = Math.min(s.count, amount);
      s.count -= n;
      amount -= n;
      if (!s.count) inv[i] = null;
    }
  }
  return true;
}

// Recipes & Crafting
export type { Recipe, SmeltingRecipe, SmeltingFuel };
export { RECIPES, SMELTING_RECIPES, SMELTING_FUELS };

// Skins & Cosmetics
export type { SkinId };
export { SKINS };

// Objectives
export const OBJECTIVES = [OBJECTIVE_REWARDS.stone, OBJECTIVE_REWARDS.kills, OBJECTIVE_REWARDS.biome, OBJECTIVE_REWARDS.chest, OBJECTIVE_REWARDS.craft] as const;

export type ObjectiveId = (typeof OBJECTIVES)[number]['id'];

export type EquipmentSlot = 'head' | 'chest' | 'legs' | 'accessory1' | 'accessory2';

export interface PlayerEquipment {
  head: ItemId | null;
  chest: ItemId | null;
  legs: ItemId | null;
  accessory1: ItemId | null;
  accessory2: ItemId | null;
}

export interface WorldUpgrades {
  vitalityCores: number;
  manaCores: number;
}

export interface WorldSave {
  id: string;
  name: string;
  generator: number;
  settings: WorldSettings;
  player: {
    x: number;
    y: number;
  };
  checkpoint: {
    x: number;
    y: number;
  };
  inventory: Inventory;
  selected: number;
  coins: number;
  progress: Record<ObjectiveId, number>;
  claimed: string[];
  edits: Record<string, Record<string, Material>>;
  opened: string[];
  harvested: string[];
  defeated: string[];
  explored: Record<string, Biome>;
  created: number;
  pendingLoot: Partial<Record<ItemId, number>>;
  equipment?: PlayerEquipment;
  upgrades?: WorldUpgrades;
  hunger?: number;
  furnace?: { ore: ItemId; fuel: ItemId; output: ItemId; remaining: number; progressMs: number; fuelMs: number; stored: number };
  containers?: Record<string, Inventory>;
  elapsedMs?: number;
  meal?: { type: string; magnitude: number; remainingMs: number; name: string };
  pinnedRecipe?: string;
  discoveredBosses?: string[];
  discoveredItems?: string[];
  discoveredEnemies?: string[];
  onboarding?: { mined: boolean; smelted: boolean; cooked: boolean; equipped: boolean };
  creations?: WorldCreation[];
  backgroundWalls?: Record<string, 18 | 19>;
  crops?: Record<string, { plantedAt: number }>;
}

export interface Bundle {
  version: number;
  active: string;
  worlds: Record<string, WorldSave>;
  profile: {
    owned: SkinId[];
    equipped: SkinId;
    parts?: string[];
    outfit?: Partial<Record<'head' | 'torso' | 'arms' | 'legs', string>>;
    gunSkins?: string[];
    guns?: Record<string, string>;
  };
}

export function newWorld(id: string, settings: WorldSettings): WorldSave {
  validateSettings(settings);
  const inventory: Inventory = Array.from({ length: 32 }, () => null);
  inventory[0] = { id: 'pickaxe', count: 1 };
  inventory[1] = { id: 'blaster', count: 1 };
  inventory[2] = { id: 'ammo', count: 64 };
  inventory[4] = { id: 'dirt', count: 20 };
  return {
    id,
    name: settings.seed,
    generator: GENERATOR_VERSION,
    settings: structuredClone(settings),
    player: { x: 12 * TILE, y: 22 * TILE - 24 },
    checkpoint: { x: 12 * TILE, y: 22 * TILE - 24 },
    inventory,
    selected: 1,
    coins: 0,
    progress: { stone: 0, kills: 0, biome: 0, chest: 0, craft: 0 },
    claimed: [],
    edits: {},
    opened: [],
    harvested: [],
    defeated: [],
    explored: {},
    created: Date.now(),
    pendingLoot: {},
    equipment: { head: null, chest: null, legs: null, accessory1: null, accessory2: null },
    upgrades: { vitalityCores: 0, manaCores: 0 },
    hunger: 100,
    crops: {},
    discoveredItems: ['pickaxe', 'blaster', 'ammo', 'dirt'],
    onboarding: { mined: false, smelted: false, cooked: false, equipped: false },
  };
}

export function initialBundle(): Bundle {
  const world = newWorld('first-world', DEFAULT_WORLD);
  return {
    version: SAVE_VERSION,
    active: world.id,
    worlds: { [world.id]: world },
    profile: { owned: ['frontier'], equipped: 'frontier' },
  };
}

export function craft(w: WorldSave, id: string, atBase: boolean) {
  const r = RECIPES.find((r) => r.id === id) || RECIPES.find((r) => r.output.id === id);
  if (!r || !atBase) throw new Error('Return to the outpost workbench or forge.');
  const isSmeltRecipe = r.id === 'bar' || r.id.startsWith('smelt_');
  if (isSmeltRecipe && !ownsStation(w, 'station_furnace', 33))
    throw new Error('Buy a Stone furnace from the shop (or craft one) and place it to smelt ingots.');
  if (r.station === 'Cooking' && !ownsStation(w, 'station_cooking', 34))
    throw new Error('Craft a Cooking station to unlock cooking recipes.');
  if (r.id === 'bar') return smelt(w, 'iron', count(w.inventory, 'coal') ? 'coal' : 'wood', 1, atBase);
  const inv = structuredClone(w.inventory);
  for (const [key, n] of Object.entries(r.ingredients)) {
    if (n && !remove(inv, key as ItemId, n)) {
      throw new Error('Not enough ingredients.');
    }
  }
  if (!add(inv, r.output.id, r.output.count)) {
    throw new Error('Inventory full. Ingredients were kept.');
  }
  w.inventory = inv;
  if (['weapon', 'tool'].includes(ITEMS[r.output.id].category)) {
    w.progress.craft++;
  }
  const discovered = noteDiscovery(w, 'item', r.output.id);
  return `Crafted ${r.output.count} ${ITEMS[r.output.id].name}${discovered ? ` · ${discovered}` : ''}`;
}

export function ownsStation(w: WorldSave, item: ItemId, mat: number) {
  if (count(w.inventory, item) > 0) return true;
  for (const chunk of Object.values(w.edits ?? {})) {
    for (const t of Object.values(chunk)) {
      if (t === mat) return true;
    }
  }
  return false;
}

export function smelt(
  w: WorldSave,
  oreId: ItemId,
  fuelId: ItemId,
  barCount: number,
  atBase: boolean
): string {
  if (!atBase) throw new Error('Return to the outpost forge to smelt ores.');
  if (!ownsStation(w, 'station_furnace', 33))
    throw new Error('Buy a Stone furnace from the shop, then place it to smelt ingots.');
  if (!Number.isInteger(barCount) || barCount < 1)
    throw new Error('Choose a valid quantity of bars to smelt.');

  const recipe = SMELTING_RECIPES.find((r) => r.oreId === oreId);
  if (!recipe) throw new Error('Unknown smelting ore.');

  const fuel = SMELTING_FUELS[fuelId as 'coal' | 'wood'];
  if (!fuel) throw new Error('Choose coal or timber as smelting fuel.');

  const oreNeeded = recipe.oreCount * barCount;
  const burnMs = fuel.burnDurationSeconds * 1000;
  const neededMs = (barCount / fuel.smeltsPerUnit) * burnMs;
  const leftoverMs = w.furnace && w.furnace.fuel === fuelId && w.furnace.remaining === 0
    ? w.furnace.fuelMs
    : 0;
  const extraMs = Math.max(0, neededMs - leftoverMs);
  const fuelNeeded = extraMs > 0 ? Math.ceil(extraMs / burnMs) : 0;

  if (count(w.inventory, oreId) < oreNeeded) {
    throw new Error(`Need ${oreNeeded} ${ITEMS[oreId].name} (have ${count(w.inventory, oreId)}).`);
  }
  if (fuelNeeded > 0 && count(w.inventory, fuelId) < fuelNeeded) {
    throw new Error(`Need ${fuelNeeded} ${ITEMS[fuelId].name} for fuel (have ${count(w.inventory, fuelId)}).`);
  }

  if (w.furnace && w.furnace.remaining > 0)
    throw new Error('The furnace is still smelting. Wait or collect finished bars first.');
  if (w.furnace && w.furnace.stored > 0 && w.furnace.output !== recipe.outputBarId)
    throw new Error('Collect the previous furnace batch first.');
  if (barCount + (w.furnace?.remaining ?? 0) > 99) throw new Error('Furnace queue is limited to 99 bars.');

  const inv = structuredClone(w.inventory);
  if (!remove(inv, oreId, oreNeeded)) {
    throw new Error('Not enough ore.');
  }
  if (fuelNeeded > 0 && !remove(inv, fuelId, fuelNeeded)) {
    throw new Error('Not enough fuel.');
  }
  w.inventory = inv;
  const stored = w.furnace?.output === recipe.outputBarId ? (w.furnace.stored ?? 0) : 0;
  w.furnace = {
    ore: oreId,
    fuel: fuelId,
    output: recipe.outputBarId,
    remaining: barCount,
    progressMs: 0,
    fuelMs: leftoverMs + fuelNeeded * burnMs,
    stored,
  };
  return `Queued ${barCount} ${ITEMS[recipe.outputBarId].name} using ${fuelNeeded} ${fuel.name}`;
}

export function unlock(b: Bundle, id: SkinId) {
  const skin = SKINS.find((s) => s.id === id);
  if (!skin) throw new Error('Unknown skin.');
  if (b.profile.owned.includes(id)) return 'Already owned. Equip it for free.';
  const w = b.worlds[b.active];
  if (w.coins < skin.price)
    throw new Error('Not enough coins. Complete objectives or sell resources.');
  w.coins -= skin.price;
  b.profile.owned.push(id);
  return `${skin.name} unlocked`;
}

export function claim(w: WorldSave, id: ObjectiveId) {
  const o = OBJECTIVES.find((o) => o.id === id);
  if (!o || w.claimed.includes(id)) throw new Error('Reward already claimed.');
  if (w.progress[id] < o.total) throw new Error('Objective is not complete.');
  w.coins += o.reward;
  w.claimed.push(id);
  return `+${o.reward} coins · ${o.name}`;
}

export function chest(w: WorldSave, id: string) {
  if (w.opened.includes(id)) throw new Error('This chest is already empty.');
  const inv = structuredClone(w.inventory);
  if (!add(inv, 'crystal', 4) || !add(inv, 'iron', 4) || !add(inv, 'ammo', 24))
    throw new Error('Make room for the chest contents first.');
  w.inventory = inv;
  w.opened.push(id);
  w.coins += CHEST_REWARD;
  w.progress.chest++;
  return `+${CHEST_REWARD} coins · 4 crystal shards · 4 iron ore · 24 ammo`;
}

export interface MaterialProfile {
  name: string;
  solid: boolean;
  color: number;
  drop?: ItemId;
  time: number;
  minTier?: number; // Minimum tool tier required to mine (0=starter, 1=copper, 2=iron, 3=cobalt, 4=aether)
  isPlatform?: boolean;
  isBackground?: boolean;
  isClimbable?: boolean;
  isHazard?: boolean;
  isDoor?: boolean;
}

export const MATERIALS: Record<Material, MaterialProfile> = {
  0: { name: 'Air', solid: false, color: 0, time: 0, minTier: 0 },
  1: { name: 'Soil', solid: true, color: 0x685142, drop: 'dirt', time: 350, minTier: 0 },
  2: { name: 'Stone', solid: true, color: 0x435463, drop: 'stone', time: 650, minTier: 0 },
  3: { name: 'Iron vein', solid: true, color: 0x4a382e, drop: 'iron', time: 1000, minTier: 1 },
  4: { name: 'Crystal vein', solid: true, color: 0x2a2048, drop: 'crystal', time: 1000, minTier: 1 },
  5: { name: 'Scrap seam', solid: true, color: 0x3a3028, drop: 'scrap', time: 800, minTier: 0 },
  6: { name: 'Bedrock', solid: true, color: 0x172633, time: Infinity },
  7: { name: 'Outpost block', solid: true, color: 0x536f78, drop: 'brick', time: 600, minTier: 0 },
  8: { name: 'Lumen torch', solid: false, color: 0xffd886, drop: 'torch', time: 150, minTier: 0 },
  9: { name: 'Frontier turf', solid: true, color: 0x526b4c, drop: 'dirt', time: 350, minTier: 0 },
  10: { name: 'Copper vein', solid: true, color: 0x5a2818, drop: 'copper_ore', time: 750, minTier: 0 },
  11: { name: 'Coal seam', solid: true, color: 0x101010, drop: 'coal', time: 700, minTier: 0 },
  12: { name: 'Silver vein', solid: true, color: 0x3a4550, drop: 'silver_ore', time: 1200, minTier: 1 },
  13: { name: 'Gold vein', solid: true, color: 0x5a4010, drop: 'gold_ore', time: 1500, minTier: 2 },
  14: { name: 'Cobalt vein', solid: true, color: 0x102848, drop: 'cobalt_ore', time: 1900, minTier: 2 },
  15: { name: 'Obsidian crust', solid: true, color: 0x1a1224, drop: 'obsidian', time: 2400, minTier: 3 },
  16: { name: 'Aether cluster', solid: true, color: 0x5533b0, drop: 'aether_crystal', time: 2600, minTier: 3 },
  17: { name: 'Wooden platform', solid: false, isPlatform: true, color: 0x8b5a2b, drop: 'platform_wood', time: 250, minTier: 0 },
  18: { name: 'Wooden wall', solid: false, isBackground: true, color: 0x5c4033, drop: 'wall_wood', time: 300, minTier: 0 },
  19: { name: 'Stone wall', solid: false, isBackground: true, color: 0x36434d, drop: 'wall_stone', time: 450, minTier: 0 },
  20: { name: 'Storage crate', solid: false, color: 0xb5651d, drop: 'chest_wood', time: 500, minTier: 0 },
  21: { name: 'Rope', solid: false, isClimbable: true, color: 0x8d6e63, drop: 'rope', time: 150, minTier: 0 },
  22: { name: 'Ladder', solid: false, isClimbable: true, color: 0xa1887f, drop: 'ladder', time: 200, minTier: 0 },
  23: { name: 'Lava', solid: false, color: 0xff4500, time: Infinity, isHazard: true },
  24: { name: 'Timber door', solid: true, color: 0x8b5a2b, drop: 'door_wood', time: 400, isDoor: true },
  25: { name: 'Open door', solid: false, color: 0x5c3d1e, drop: 'door_wood', time: 400, isDoor: true },
  26: { name: 'Vitality Totem', solid: false, color: 0x2ecc71, drop: 'totem_vitality', time: 500, minTier: 0 },
  27: { name: 'Warding Totem', solid: false, color: 0x3498db, drop: 'totem_warding', time: 500, minTier: 0 },
  28: { name: 'Prospector Totem', solid: false, color: 0xf39c12, drop: 'totem_prospector', time: 500, minTier: 0 },
  29: { name: 'Arcane Totem', solid: false, color: 0x9b59b6, drop: 'totem_arcane', time: 500, minTier: 0 },
  32: {name: 'Workbench', solid: false, color: 12359272, drop: 'station_workbench', time: 450, minTier: 0},
  33: {name: 'Linked furnace', solid: false, color: 15375193, drop: 'station_furnace', time: 450, minTier: 0},
  34: {name: 'Cooking station', solid: false, color: 14531203, drop: 'station_cooking', time: 450, minTier: 0},
  35: {name: 'Advanced workbench', solid: false, color: 7912912, drop: 'station_advanced', time: 450, minTier: 0},
  36: {name: 'Timber table', solid: false, color: 10254162, drop: 'table_wood', time: 450, minTier: 0},
  37: {name: 'Timber chair', solid: false, color: 10254162, drop: 'chair_wood', time: 450, minTier: 0},
  38: {name: 'Expedition banner', solid: false, color: 6862514, drop: 'banner', time: 450, minTier: 0},
  39: {name: 'Prism lamp', solid: false, color: 15069088, drop: 'lamp', time: 450, minTier: 0},
  40: {name: 'Alloy block', solid: true, color: 7901084, drop: 'block_metal', time: 450, minTier: 0},
  41: {name: 'Crystal inlay', solid: true, color: 8680381, drop: 'block_crystal', time: 450, minTier: 0},
  42: {name: 'Timber block', solid: true, color: 9989961, drop: 'wood', time: 450, minTier: 0},
  30: { name: 'Crop seedling', solid: false, color: 0x4caf50, drop: 'seeds_crop', time: 250, minTier: 0 },
  31: { name: 'Mature crop', solid: false, color: 0x8bc34a, drop: 'vegetable_raw', time: 300, minTier: 0 },
};

export const BUILDING: Partial<Record<ItemId, Material>> = {
  dirt: 1,
  stone: 2,
  brick: 7,
  torch: 8,
  platform_wood: 17,
  wall_wood: 18,
  wall_stone: 19,
  chest_wood: 20,
  rope: 21,
  ladder: 22,
  door_wood: 24,
  totem_vitality: 26,
  totem_warding: 27,
  totem_prospector: 28,
  totem_arcane: 29,
  seeds_crop: 30,
  station_workbench: 32,
  station_furnace: 33,
  station_cooking: 34,
  station_advanced: 35,
  table_wood: 36,
  chair_wood: 37,
  banner: 38,
  lamp: 39,
  block_metal: 40,
  block_crystal: 41,
  wood: 42,

};

export function useVitalityCore(w: WorldSave): string {
  w.upgrades ??= { vitalityCores: 0, manaCores: 0 };
  if (w.upgrades.vitalityCores >= 10) {
    throw new Error('Maximum Vitality Cores reached (10/10).');
  }
  if (!remove(w.inventory, 'vitality_core', 1)) {
    throw new Error('No Vitality Core in inventory.');
  }
  w.upgrades.vitalityCores++;
  return `Vitality Core consumed! Max Health increased to ${100 + w.upgrades.vitalityCores * 10} (${w.upgrades.vitalityCores}/10).`;
}

export function useManaCore(w: WorldSave): string {
  w.upgrades ??= { vitalityCores: 0, manaCores: 0 };
  if (w.upgrades.manaCores >= 10) {
    throw new Error('Maximum Mana Cores reached (10/10).');
  }
  if (!remove(w.inventory, 'mana_core', 1)) {
    throw new Error('No Mana Core in inventory.');
  }
  w.upgrades.manaCores++;
  return `Mana Core consumed! Max Mana increased to ${100 + w.upgrades.manaCores * 10} (${w.upgrades.manaCores}/10).`;
}

export type OnboardingKey = 'mined' | 'smelted' | 'cooked' | 'equipped';
export function markOnboarding(w: WorldSave, key: OnboardingKey) {
  w.onboarding ??= { mined: false, smelted: false, cooked: false, equipped: false };
  w.onboarding[key] = true;
}
export function noteDiscovery(w: WorldSave, kind: 'item' | 'enemy', id: string) {
  const list = kind === 'item' ? (w.discoveredItems ??= []) : (w.discoveredEnemies ??= []);
  if (list.includes(id)) return '';
  list.push(id);
  if (kind !== 'item') return '';
  const unlocked = RECIPES.filter(r => Object.prototype.hasOwnProperty.call(r.ingredients, id)).slice(0, 3);
  if (!unlocked.length) return '';
  return `New recipes: ${unlocked.map(r => r.name).join(', ')}`;
}
export function placedTiles(w: WorldSave, material: number) {
  const out: { x: number; y: number }[] = [];
  for (const [chunkKey, chunk] of Object.entries(w.edits)) {
    const [cx, cy] = chunkKey.split(',').map(Number);
    for (const [pos, m] of Object.entries(chunk)) {
      if (m !== material) continue;
      const [lx, ly] = pos.split(',').map(Number);
      out.push({ x: cx * CHUNK + lx, y: cy * CHUNK + ly });
    }
  }
  return out;
}

export function equipItem(w: WorldSave, slot: EquipmentSlot, itemId: ItemId): string {
  w.equipment ??= { head: null, chest: null, legs: null, accessory1: null, accessory2: null };
  const itemDef = ITEMS[itemId];
  if (!itemDef || itemDef.category !== 'equipment') {
    throw new Error('This item cannot be equipped.');
  }
  if (slot === 'head' && !itemId.startsWith('helmet_')) {
    throw new Error('Only helmets can be equipped in the Head slot.');
  }
  if (slot === 'chest' && !itemId.startsWith('chest_')) {
    throw new Error('Only torso armor can be equipped in the Chest slot.');
  }
  if (slot === 'legs' && !itemId.startsWith('boots_') && itemId !== 'boots_iron') {
    throw new Error('Only leg armor can be equipped in the Legs slot.');
  }
  if ((slot === 'accessory1' || slot === 'accessory2') && !itemId.startsWith('charm_') && !itemId.startsWith('boots_speed')) {
    throw new Error('Only accessories and charms can be equipped in Accessory slots.');
  }
  if (!remove(w.inventory, itemId, 1)) {
    throw new Error('Item not in inventory.');
  }
  const prev = w.equipment[slot];
  if (prev) {
    if (!add(w.inventory, prev, 1)) {
      add(w.inventory, itemId, 1);
      throw new Error('Inventory full. Cannot unequip previous item.');
    }
  }
  w.equipment[slot] = itemId;
  markOnboarding(w, 'equipped');
  noteDiscovery(w, 'item', itemId);
  return `Equipped ${itemDef.name}`;
}

export function unequipItem(w: WorldSave, slot: EquipmentSlot): string {
  w.equipment ??= { head: null, chest: null, legs: null, accessory1: null, accessory2: null };
  const current = w.equipment[slot];
  if (!current) {
    throw new Error('No item equipped in this slot.');
  }
  if (!add(w.inventory, current, 1)) {
    throw new Error('Inventory full. Make room to unequip this item.');
  }
  w.equipment[slot] = null;
  return `Unequipped ${ITEMS[current].name}`;
}

export interface DerivedStats {
  maxHealth: number;
  maxMana: number;
  defense: number;
  speedMultiplier: number;
  mineSpeedMultiplier: number;
  knockbackResistance: number;
}

const EQUIPMENT_BONUS: Partial<Record<ItemId, { defense?: number; maxMana?: number; speed?: number; mine?: number; knockback?: number }>> = {
  helmet_iron: { defense: 4 },
  chest_iron: { defense: 8 },
  boots_iron: { defense: 4 },
  charm_mining: { mine: 0.25 },
  boots_speed: { speed: 0.2 },
  charm_mana: { maxMana: 30 },
  charm_knockback: { knockback: 0.5 },
};

export function derivePlayerStats(w: WorldSave, activeEffects: { type: string }[] = []): DerivedStats {
  const vitalityCount = w.upgrades?.vitalityCores ?? 0;
  const manaCount = w.upgrades?.manaCores ?? 0;
  let maxHealth = 100 + vitalityCount * 10;
  let maxMana = 100 + manaCount * 10;
  let defense = 0;
  let speedMultiplier = 1.0;
  let mineSpeedMultiplier = 1.0;
  let knockbackResistance = 0;

  const eq = w.equipment ?? { head: null, chest: null, legs: null, accessory1: null, accessory2: null };
  const equippedItems = [eq.head, eq.chest, eq.legs, eq.accessory1, eq.accessory2].filter(Boolean) as ItemId[];

  for (const item of equippedItems) {
    const bonus = EQUIPMENT_BONUS[item];
    if (!bonus) continue;
    defense += bonus.defense ?? 0;
    maxMana += bonus.maxMana ?? 0;
    speedMultiplier += bonus.speed ?? 0;
    mineSpeedMultiplier += bonus.mine ?? 0;
    knockbackResistance += bonus.knockback ?? 0;
  }

  if (w.meal && w.meal.remainingMs > 0) {
    if (w.meal.type === 'vitality') maxHealth += w.meal.magnitude;
    if (w.meal.type === 'defense') defense += w.meal.magnitude;
    if (w.meal.type === 'speed') speedMultiplier += w.meal.magnitude;
  }
  for (const eff of new Map(activeEffects.map(e => [e.type, e])).values()) {
    if (eff.type === 'defense') defense += 10;
    else if (eff.type === 'speed') speedMultiplier += 0.25;
    else if (eff.type === 'slowing') speedMultiplier *= 0.55;
  }

  return {
    maxHealth,
    maxMana,
    defense,
    speedMultiplier,
    mineSpeedMultiplier,
    knockbackResistance,
  };
}

export function eatFood(
  w: WorldSave,
  itemId: ItemId
): { message: string; hungerRestored: number; healthRestored: number; buff?: FoodProfile['buff'] } {
  const profile = FOOD_PROFILES[itemId];
  if (!profile) {
    throw new Error('This item is not edible.');
  }
  if (!remove(w.inventory, itemId, 1)) {
    throw new Error('Item not in inventory.');
  }
  w.hunger = Math.min(100, Math.max(0, (w.hunger ?? 100) + profile.hungerRestore));
  if (profile.buff) w.meal = { type: profile.buff.type, magnitude: profile.buff.magnitude, remainingMs: profile.buff.durationSeconds * 1000, name: profile.buff.name };
  const buffMsg = profile.buff ? ` [${profile.buff.name}: ${profile.buff.description}]` : '';
  const message = `Consumed ${profile.name} (+${profile.hungerRestore} Hunger${profile.healthRestore > 0 ? `, +${profile.healthRestore} HP` : ''})${buffMsg}`;
  return {
    message,
    hungerRestored: profile.hungerRestore,
    healthRestored: profile.healthRestore,
    buff: profile.buff,
  };
}

export function cookDish(w: WorldSave, recipeId: string, atStation = false): string {
  if (!atStation) throw new Error('Return to the outpost cooking station.');
  if (!ownsStation(w, 'station_cooking', 34))
    throw new Error('Craft a Cooking station first to unlock cooking recipes.');
  const recipe = COOKING_RECIPES.find(r => r.id === recipeId);
  if (!recipe) {
    throw new Error(`Unknown cooking recipe: ${recipeId}`);
  }
  for (const [ingredientId, needed] of Object.entries(recipe.ingredients)) {
    if (count(w.inventory, ingredientId as ItemId) < (needed ?? 1)) {
      throw new Error(`Insufficient ${ITEMS[ingredientId as ItemId]?.name || ingredientId} (needs ${needed}).`);
    }
  }
  const removed: { id: ItemId; count: number }[] = [];
  for (const [ingredientId, needed] of Object.entries(recipe.ingredients)) {
    const qty = needed ?? 1;
    if (!remove(w.inventory, ingredientId as ItemId, qty)) {
      for (const r of removed) {
        add(w.inventory, r.id, r.count);
      }
      throw new Error(`Failed to consume ${ingredientId}.`);
    }
    removed.push({ id: ingredientId as ItemId, count: qty });
  }
  if (!add(w.inventory, recipe.output.id, recipe.output.count)) {
    for (const r of removed) {
      add(w.inventory, r.id, r.count);
    }
    throw new Error('Inventory full. Cannot receive prepared dish.');
  }
  markOnboarding(w, 'cooked');
  const discovered = noteDiscovery(w, 'item', recipe.output.id);
  return `Prepared ${recipe.output.count}x ${recipe.name}!${discovered ? ` · ${discovered}` : ''}`;
}

export function compareItem(w: WorldSave, id: ItemId): string {
  const item = ITEMS[id];
  const lines = [`${item.name} — ${item.description}`];
  const weapon = WEAPONS[id];
  if (weapon) {
    const equippedId = w.inventory.slice(0, 8).find(s => s && WEAPONS[s.id] && s.id !== id)?.id;
    const other = equippedId ? WEAPONS[equippedId] : undefined;
    lines.push(`Damage ${weapon.damage}${other ? ` (${weapon.damage - other.damage >= 0 ? '+' : ''}${weapon.damage - other.damage} vs ${ITEMS[equippedId!].name})` : ''}`);
    lines.push(`Cooldown ${weapon.cooldown}ms${other ? ` (${weapon.cooldown - other.cooldown >= 0 ? '+' : ''}${weapon.cooldown - other.cooldown}ms)` : ''}`);
  }
  const bonus = EQUIPMENT_BONUS[id];
  if (bonus) {
    const slot = id.startsWith('helmet_') ? 'head' : id.startsWith('chest_') ? 'chest' : id.startsWith('boots_iron') ? 'legs' : id.startsWith('boots_') ? 'legs' : 'accessory1';
    const worn = w.equipment?.[slot as EquipmentSlot];
    const wornBonus = worn ? EQUIPMENT_BONUS[worn] : undefined;
    if (bonus.defense) lines.push(`Defense +${bonus.defense}${worn && worn !== id ? ` vs equipped ${wornBonus?.defense ?? 0}` : worn === id ? ' (equipped)' : ''}`);
    if (bonus.maxMana) lines.push(`Max mana +${bonus.maxMana}`);
    if (bonus.speed) lines.push(`Move speed +${Math.round(bonus.speed * 100)}%`);
    if (bonus.mine) lines.push(`Mine speed +${Math.round(bonus.mine * 100)}%`);
    if (bonus.knockback) lines.push(`Knockback resist ${Math.round(bonus.knockback * 100)}%`);
  }
  return lines.join('\n');
}

export { STATUS_EFFECTS, createStatusEffect, tickStatusEffects, type ActiveStatusEffect, type StatusEffectType } from './registry/statusEffects';
export { TOTEM_REGISTRY, getTotemDefinition, type TotemDefinition } from './registry/totems';
export { FOOD_PROFILES, COOKING_RECIPES, getFoodProfile, type FoodProfile, type CookingRecipe };
export { ANIMAL_REGISTRY, type AnimalDefinition, type AnimalBehavior };
export { BIOME_VARIANTS, ELITE_MODIFIERS, getEnemySpec, type EliteModifier };

export { WEAPONS };

