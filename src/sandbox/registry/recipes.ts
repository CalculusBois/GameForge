/**
 * Crafting and Smelting Recipes Registry for GameForge.
 * Preserves all legacy recipes while introducing tiered equipment,
 * smelting recipes with fuel mechanics, building parts, and totems.
 */

import type { ItemId } from './items';

export type CraftingStation = 'Workbench' | 'Forge' | 'Cooking' | 'Hand';

export interface RecipeOutput {
  id: ItemId;
  count: number;
}

export interface Recipe {
  id: string;
  name: string;
  station: CraftingStation;
  ingredients: Partial<Record<ItemId, number>>;
  output: RecipeOutput;
  tier?: number; // Progression tier required
  craftTimeSeconds?: number;
  category?: 'gear' | 'resource' | 'building' | 'consumable' | 'totem';
}

export interface SmeltingFuel {
  id: ItemId;
  name: string;
  burnDurationSeconds: number;
  smeltsPerUnit: number;
}

export const SMELTING_FUELS: Record<string, SmeltingFuel> = {
  coal: {
    id: 'coal',
    name: 'Coal',
    burnDurationSeconds: 80,
    smeltsPerUnit: 8,
  },
  wood: {
    id: 'wood',
    name: 'Timber',
    burnDurationSeconds: 20,
    smeltsPerUnit: 2,
  },
};

export const RECIPES: Recipe[] = [
  // ==========================================
  // --- Legacy Recipes (Preserved IDs & Stats) ---
  // ==========================================
  {
    id: 'bar',
    name: 'Smelt iron',
    station: 'Forge',
    ingredients: { iron: 2 },
    output: { id: 'bar', count: 1 },
    tier: 2,
    craftTimeSeconds: 5,
    category: 'resource',
  },
  {
    id: 'sword',
    name: 'Arc sabre',
    station: 'Workbench',
    ingredients: { bar: 2, wood: 3 },
    output: { id: 'sword', count: 1 },
    tier: 1,
    craftTimeSeconds: 3,
    category: 'gear',
  },
  {
    id: 'staff',
    name: 'Prism staff',
    station: 'Workbench',
    ingredients: { crystal: 4, wood: 4 },
    output: { id: 'staff', count: 1 },
    tier: 2,
    craftTimeSeconds: 4,
    category: 'gear',
  },
  {
    id: 'drill',
    name: 'Resonant pickaxe',
    station: 'Forge',
    ingredients: { bar: 3, scrap: 3 },
    output: { id: 'drill', count: 1 },
    tier: 2,
    craftTimeSeconds: 6,
    category: 'gear',
  },
  {
    id: 'carbine',
    name: 'Coil carbine',
    station: 'Forge',
    ingredients: { bar: 2, scrap: 5 },
    output: { id: 'carbine', count: 1 },
    tier: 2,
    craftTimeSeconds: 6,
    category: 'gear',
  },
  {
    id: 'tonic',
    name: 'Field tonic',
    station: 'Workbench',
    ingredients: { herb: 2 },
    output: { id: 'tonic', count: 1 },
    tier: 0,
    craftTimeSeconds: 2,
    category: 'consumable',
  },
  {
    id: 'torch',
    name: 'Lumen torches',
    station: 'Workbench',
    ingredients: { wood: 1, crystal: 1 },
    output: { id: 'torch', count: 4 },
    tier: 0,
    craftTimeSeconds: 1,
    category: 'building',
  },
  {
    id: 'brick',
    name: 'Outpost blocks',
    station: 'Workbench',
    ingredients: { stone: 3 },
    output: { id: 'brick', count: 4 },
    tier: 0,
    craftTimeSeconds: 1,
    category: 'building',
  },

  // ==========================================
  // --- Expanded Smelting (Forge) ---
  // ==========================================
  {
    id: 'smelt_copper',
    name: 'Smelt copper bar',
    station: 'Forge',
    ingredients: { copper_ore: 2 },
    output: { id: 'copper_bar', count: 1 },
    tier: 1,
    craftTimeSeconds: 4,
    category: 'resource',
  },
  {
    id: 'smelt_silver',
    name: 'Smelt silver bar',
    station: 'Forge',
    ingredients: { silver_ore: 2 },
    output: { id: 'silver_bar', count: 1 },
    tier: 2,
    craftTimeSeconds: 6,
    category: 'resource',
  },
  {
    id: 'smelt_gold',
    name: 'Smelt gold bar',
    station: 'Forge',
    ingredients: { gold_ore: 2 },
    output: { id: 'gold_bar', count: 1 },
    tier: 3,
    craftTimeSeconds: 8,
    category: 'resource',
  },
  {
    id: 'smelt_cobalt',
    name: 'Smelt cobalt bar',
    station: 'Forge',
    ingredients: { cobalt_ore: 3 },
    output: { id: 'cobalt_bar', count: 1 },
    tier: 3,
    craftTimeSeconds: 10,
    category: 'resource',
  },

  // ==========================================
  // --- Expanded Tools & Utility ---
  // ==========================================
  {
    id: 'craft_pickaxe_copper',
    name: 'Copper pickaxe',
    station: 'Forge',
    ingredients: { copper_bar: 3, wood: 2 },
    output: { id: 'pickaxe_copper', count: 1 },
    tier: 1,
    craftTimeSeconds: 4,
    category: 'gear',
  },
  {
    id: 'craft_pickaxe_iron',
    name: 'Reinforced iron pickaxe',
    station: 'Forge',
    ingredients: { bar: 4, wood: 3 },
    output: { id: 'pickaxe_iron', count: 1 },
    tier: 2,
    craftTimeSeconds: 6,
    category: 'gear',
  },
  {
    id: 'craft_pickaxe_cobalt',
    name: 'Cobalt pickaxe',
    station: 'Forge',
    ingredients: { cobalt_bar: 5, bar: 2 },
    output: { id: 'pickaxe_cobalt', count: 1 },
    tier: 3,
    craftTimeSeconds: 10,
    category: 'gear',
  },
  {
    id: 'craft_pickaxe_aether',
    name: 'Aether pickaxe',
    station: 'Forge',
    ingredients: { cobalt_bar: 4, aether_crystal: 4 },
    output: { id: 'pickaxe_aether', count: 1 },
    tier: 4,
    craftTimeSeconds: 12,
    category: 'gear',
  },
  {
    id: 'craft_axe_wood',
    name: 'Timber axe',
    station: 'Workbench',
    ingredients: { copper_bar: 2, wood: 4 },
    output: { id: 'axe_wood', count: 1 },
    tier: 1,
    craftTimeSeconds: 3,
    category: 'gear',
  },
  {
    id: 'craft_hammer_construction',
    name: 'Builder hammer',
    station: 'Workbench',
    ingredients: { bar: 2, wood: 4 },
    output: { id: 'hammer_construction', count: 1 },
    tier: 2,
    craftTimeSeconds: 3,
    category: 'gear',
  },
  {
    id: 'craft_grapple_hook',
    name: 'Grapple hook',
    station: 'Workbench',
    ingredients: { bar: 3, scrap: 4, rope: 2 },
    output: { id: 'grapple_hook', count: 1 },
    tier: 2,
    craftTimeSeconds: 6,
    category: 'gear',
  },
  {
    id: 'craft_rope',
    name: 'Woven rope (×3)',
    station: 'Workbench',
    ingredients: { herb: 3 },
    output: { id: 'rope', count: 3 },
    tier: 0,
    craftTimeSeconds: 2,
    category: 'building',
  },
  {
    id: 'craft_ladder',
    name: 'Wooden ladder (×3)',
    station: 'Workbench',
    ingredients: { wood: 3 },
    output: { id: 'ladder', count: 3 },
    tier: 0,
    craftTimeSeconds: 2,
    category: 'building',
  },

  // ==========================================
  // --- Expanded Weapons (Ranged, Melee, Magic) ---
  // ==========================================
  {
    id: 'craft_blaster_burst',
    name: 'Pulse burst rifle',
    station: 'Forge',
    ingredients: { copper_bar: 3, scrap: 4 },
    output: { id: 'blaster_burst', count: 1 },
    tier: 1,
    craftTimeSeconds: 5,
    category: 'gear',
  },
  {
    id: 'craft_blaster_scatter',
    name: 'Scatter blaster',
    station: 'Forge',
    ingredients: { bar: 3, scrap: 6 },
    output: { id: 'blaster_scatter', count: 1 },
    tier: 2,
    craftTimeSeconds: 6,
    category: 'gear',
  },
  {
    id: 'craft_rifle_rail',
    name: 'Rail carbine',
    station: 'Forge',
    ingredients: { cobalt_bar: 4, silver_bar: 3, crystal: 6 },
    output: { id: 'rifle_rail', count: 1 },
    tier: 3,
    craftTimeSeconds: 10,
    category: 'gear',
  },
  {
    id: 'craft_sword_long',
    name: 'Heavy broadsword',
    station: 'Forge',
    ingredients: { bar: 4, wood: 3 },
    output: { id: 'sword_long', count: 1 },
    tier: 2,
    craftTimeSeconds: 5,
    category: 'gear',
  },
  {
    id: 'craft_spear',
    name: 'Kinetic spear',
    station: 'Workbench',
    ingredients: { copper_bar: 3, wood: 5 },
    output: { id: 'spear', count: 1 },
    tier: 1,
    craftTimeSeconds: 4,
    category: 'gear',
  },
  {
    id: 'craft_hammer_heavy',
    name: 'Crag warhammer',
    station: 'Forge',
    ingredients: { bar: 5, stone: 8 },
    output: { id: 'hammer_heavy', count: 1 },
    tier: 2,
    craftTimeSeconds: 7,
    category: 'gear',
  },
  {
    id: 'craft_staff_ember',
    name: 'Ember staff',
    station: 'Workbench',
    ingredients: { wood: 4, coal: 6, crystal: 3 },
    output: { id: 'staff_ember', count: 1 },
    tier: 1,
    craftTimeSeconds: 4,
    category: 'gear',
  },
  {
    id: 'craft_wand_frost',
    name: 'Frost wand',
    station: 'Workbench',
    ingredients: { silver_bar: 2, crystal: 4 },
    output: { id: 'wand_frost', count: 1 },
    tier: 2,
    craftTimeSeconds: 5,
    category: 'gear',
  },
  {
    id: 'craft_staff_arc',
    name: 'Arc lightning staff',
    station: 'Forge',
    ingredients: { silver_bar: 3, scrap: 4, crystal: 4 },
    output: { id: 'staff_arc', count: 1 },
    tier: 2,
    craftTimeSeconds: 7,
    category: 'gear',
  },
  {
    id: 'craft_tome_crystal',
    name: 'Aetheric grimoire',
    station: 'Workbench',
    ingredients: { gold_bar: 3, aether_crystal: 3 },
    output: { id: 'tome_crystal', count: 1 },
    tier: 4,
    craftTimeSeconds: 10,
    category: 'gear',
  },

  // ==========================================
  // --- Armor & Accessories ---
  // ==========================================
  {
    id: 'craft_helmet_iron',
    name: 'Iron helm',
    station: 'Forge',
    ingredients: { bar: 3 },
    output: { id: 'helmet_iron', count: 1 },
    tier: 2,
    craftTimeSeconds: 4,
    category: 'gear',
  },
  {
    id: 'craft_chest_iron',
    name: 'Iron chestplate',
    station: 'Forge',
    ingredients: { bar: 5 },
    output: { id: 'chest_iron', count: 1 },
    tier: 2,
    craftTimeSeconds: 6,
    category: 'gear',
  },
  {
    id: 'craft_boots_iron',
    name: 'Iron greaves',
    station: 'Forge',
    ingredients: { bar: 3 },
    output: { id: 'boots_iron', count: 1 },
    tier: 2,
    craftTimeSeconds: 4,
    category: 'gear',
  },
  {
    id: 'craft_boots_speed',
    name: 'Kinetic striders',
    station: 'Workbench',
    ingredients: { scrap: 4, copper_bar: 3 },
    output: { id: 'boots_speed', count: 1 },
    tier: 1,
    craftTimeSeconds: 5,
    category: 'gear',
  },
  {
    id: 'craft_charm_mining',
    name: 'Prospector charm',
    station: 'Workbench',
    ingredients: { silver_bar: 2, crystal: 3 },
    output: { id: 'charm_mining', count: 1 },
    tier: 2,
    craftTimeSeconds: 5,
    category: 'gear',
  },
  {
    id: 'craft_vitality_core',
    name: 'Vitality crystal core',
    station: 'Workbench',
    ingredients: { gold_bar: 2, herb: 8, crystal: 4 },
    output: { id: 'vitality_core', count: 1 },
    tier: 3,
    craftTimeSeconds: 8,
    category: 'consumable',
  },
  {
    id: 'craft_mana_core',
    name: 'Mana crystal core',
    station: 'Workbench',
    ingredients: { gold_bar: 2, crystal: 8 },
    output: { id: 'mana_core', count: 1 },
    tier: 3,
    craftTimeSeconds: 8,
    category: 'consumable',
  },

  // ==========================================
  // --- Support Totems ---
  // ==========================================
  {
    id: 'craft_totem_vitality',
    name: 'Vitality totem',
    station: 'Workbench',
    ingredients: { wood: 8, herb: 6, crystal: 3 },
    output: { id: 'totem_vitality', count: 1 },
    tier: 1,
    craftTimeSeconds: 6,
    category: 'totem',
  },
  {
    id: 'craft_totem_warding',
    name: 'Warding totem',
    station: 'Forge',
    ingredients: { bar: 4, stone: 10, crystal: 2 },
    output: { id: 'totem_warding', count: 1 },
    tier: 2,
    craftTimeSeconds: 6,
    category: 'totem',
  },
  {
    id: 'craft_totem_prospector',
    name: 'Prospector totem',
    station: 'Workbench',
    ingredients: { copper_bar: 4, silver_bar: 2, scrap: 4 },
    output: { id: 'totem_prospector', count: 1 },
    tier: 2,
    craftTimeSeconds: 6,
    category: 'totem',
  },
  {
    id: 'craft_totem_arcane',
    name: 'Arcane totem',
    station: 'Workbench',
    ingredients: { gold_bar: 3, crystal: 6 },
    output: { id: 'totem_arcane', count: 1 },
    tier: 3,
    craftTimeSeconds: 8,
    category: 'totem',
  },

  // ==========================================
  // --- Advanced Building & Stations ---
  // ==========================================
  {
    id: 'craft_chest_wood',
    name: 'Storage crate',
    station: 'Workbench',
    ingredients: { wood: 8, iron: 1 },
    output: { id: 'chest_wood', count: 1 },
    tier: 1,
    craftTimeSeconds: 3,
    category: 'building',
  },
  {
    id: 'craft_platform_wood',
    name: 'Wooden platforms (×4)',
    station: 'Workbench',
    ingredients: { wood: 2 },
    output: { id: 'platform_wood', count: 4 },
    tier: 0,
    craftTimeSeconds: 1,
    category: 'building',
  },
  {
    id: 'craft_wall_wood',
    name: 'Wood wall panels (×4)',
    station: 'Workbench',
    ingredients: { wood: 2 },
    output: { id: 'wall_wood', count: 4 },
    tier: 0,
    craftTimeSeconds: 1,
    category: 'building',
  },
  {
    id: 'craft_wall_stone',
    name: 'Stone masonry walls (×4)',
    station: 'Workbench',
    ingredients: { stone: 2 },
    output: { id: 'wall_stone', count: 4 },
    tier: 0,
    craftTimeSeconds: 1,
    category: 'building',
  },
  {
    id: 'craft_door_wood',
    name: 'Timber door',
    station: 'Workbench',
    ingredients: { wood: 4 },
    output: { id: 'door_wood', count: 1 },
    tier: 0,
    craftTimeSeconds: 2,
    category: 'building',
  },
  { id: 'build_station_workbench', name: 'Workbench', station: 'Workbench', ingredients: { wood: 8 }, output: {id: 'station_workbench',count: 1}, category: 'building' },
  { id: 'build_station_furnace', name: 'Linked furnace', station: 'Workbench', ingredients: { stone: 12, bar: 2 }, output: {id: 'station_furnace',count: 1}, category: 'building' },
  { id: 'build_station_cooking', name: 'Cooking station workbench', station: 'Workbench', ingredients: { stone: 6, wood: 4 }, output: {id: 'station_cooking',count: 1}, category: 'building' },
  { id: 'build_station_advanced', name: 'Advanced workbench', station: 'Workbench', ingredients: { bar: 6, crystal: 4 }, output: {id: 'station_advanced',count: 1}, category: 'building' },
  { id: 'build_table_wood', name: 'Timber table', station: 'Workbench', ingredients: { wood: 3 }, output: {id: 'table_wood',count: 1}, category: 'building' },
  { id: 'build_chair_wood', name: 'Timber chair', station: 'Workbench', ingredients: { wood: 2 }, output: {id: 'chair_wood',count: 1}, category: 'building' },
  { id: 'build_banner', name: 'Expedition banner', station: 'Workbench', ingredients: { wood: 2, herb: 2 }, output: {id: 'banner',count: 1}, category: 'building' },
  { id: 'build_lamp', name: 'Prism lamp', station: 'Workbench', ingredients: { bar: 1, crystal: 1 }, output: {id: 'lamp',count: 1}, category: 'building' },
  { id: 'build_block_metal', name: 'Alloy block', station: 'Workbench', ingredients: { bar: 1 }, output: {id: 'block_metal',count: 1}, category: 'building' },
  { id: 'build_block_crystal', name: 'Crystal inlay', station: 'Workbench', ingredients: { stone: 2, crystal: 1 }, output: {id: 'block_crystal',count: 1}, category: 'building' },
];

/** Retrieve recipe by identifier */
export function getRecipe(id: string): Recipe | undefined {
  return RECIPES.find((r) => r.id === id);
}

/** Retrieve recipes available at a specific crafting station */
export function getRecipesByStation(station: CraftingStation): Recipe[] {
  return RECIPES.filter((r) => r.station === station);
}

export interface SmeltingRecipe {
  id: string;
  name: string;
  oreId: ItemId;
  oreCount: number;
  outputBarId: ItemId;
  tier: number;
}

export const SMELTING_RECIPES: SmeltingRecipe[] = [
  { id: 'smelt_copper', name: 'Smelt copper', oreId: 'copper_ore', oreCount: 2, outputBarId: 'copper_bar', tier: 1 },
  { id: 'smelt_iron', name: 'Smelt iron', oreId: 'iron', oreCount: 2, outputBarId: 'bar', tier: 2 },
  { id: 'smelt_silver', name: 'Smelt silver', oreId: 'silver_ore', oreCount: 2, outputBarId: 'silver_bar', tier: 2 },
  { id: 'smelt_gold', name: 'Smelt gold', oreId: 'gold_ore', oreCount: 2, outputBarId: 'gold_bar', tier: 3 },
  { id: 'smelt_cobalt', name: 'Smelt cobalt', oreId: 'cobalt_ore', oreCount: 3, outputBarId: 'cobalt_bar', tier: 3 },
];

