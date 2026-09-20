/**
 * Biomes Registry for GameForge.
 * Defines the 6 continuous procedural biomes (Verdant frontier, Rust wastes,
 * Frost highlands, Fungal hollows, Crystal depths, Ashen depths),
 * their aesthetic color palettes, hazard levels, resource distributions, and spawn pools.
 */

import type { ItemId } from './items';

export type BiomeId =
  | 'Verdant frontier'
  | 'Rust wastes'
  | 'Crystal depths'
  | 'Frost highlands'
  | 'Fungal hollows'
  | 'Ashen depths';

export interface BiomePalette {
  skyColor: string;
  groundColor: string;
  stoneColor: string;
  wallColor: string;
  accentColor: string;
}

export interface BiomeDefinition {
  id: BiomeId;
  name: string;
  description: string;
  dangerLevel: number; // 1 (peaceful starter) to 5 (extreme hazard)
  depthRange: 'surface' | 'cavern' | 'deep_mantle' | 'all';
  palette: BiomePalette;
  vegetationDensity: number; // 0.0 to 3.0
  surfaceFeature: 'temperate_trees' | 'rusted_ruins' | 'pine_needles' | 'giant_fungi' | 'crystals' | 'obsidian_pillars';
  ores: {
    oreId: ItemId;
    weight: number; // relative spawn likelihood
  }[];
  hostiles: {
    enemyId: string;
    weight: number;
  }[];
  wildlife: {
    animalId: string;
    weight: number;
  }[];
  ambientHazard?: {
    type: 'cold' | 'heat' | 'spores';
    intensity: number;
  };
}

export const BIOMES: Record<BiomeId, BiomeDefinition> = {
  'Verdant frontier': {
    id: 'Verdant frontier',
    name: 'Verdant Frontier',
    description: 'Temperate grassy hills and lush forests. Low danger with abundant timber and surface copper.',
    dangerLevel: 1,
    depthRange: 'surface',
    palette: {
      skyColor: '#4ea8de',
      groundColor: '#526b4c',
      stoneColor: '#435463',
      wallColor: '#2b3842',
      accentColor: '#62dfc3',
    },
    vegetationDensity: 1.8,
    surfaceFeature: 'temperate_trees',
    ores: [
      { oreId: 'copper_ore', weight: 40 },
      { oreId: 'iron', weight: 35 },
      { oreId: 'coal', weight: 25 },
    ],
    hostiles: [
      { enemyId: 'crawler', weight: 28 },
      { enemyId: 'hopper', weight: 18 },
      { enemyId: 'stalker', weight: 16 },
      { enemyId: 'thornback', weight: 12 },
      { enemyId: 'rockmite', weight: 12 },
      { enemyId: 'spitter', weight: 8 },
      { enemyId: 'drone', weight: 6 },
    ],
    wildlife: [
      { animalId: 'forest_grazer', weight: 45 },
      { animalId: 'ground_bird', weight: 35 },
      { animalId: 'burrowing_mammal', weight: 20 },
    ],
  },

  'Rust wastes': {
    id: 'Rust wastes',
    name: 'Rust Wastes',
    description: 'Scrap-choked badlands of past industrial expeditions. Ruined automatons and scrap caches.',
    dangerLevel: 2,
    depthRange: 'surface',
    palette: {
      skyColor: '#b87333',
      groundColor: '#7a5230',
      stoneColor: '#5c4838',
      wallColor: '#3d2e24',
      accentColor: '#edb47b',
    },
    vegetationDensity: 0.4,
    surfaceFeature: 'rusted_ruins',
    ores: [
      { oreId: 'iron', weight: 45 },
      { oreId: 'copper_ore', weight: 25 },
      { oreId: 'scrap', weight: 30 },
    ],
    hostiles: [
      { enemyId: 'crawler_rust', weight: 22 },
      { enemyId: 'gunner', weight: 18 },
      { enemyId: 'brute', weight: 16 },
      { enemyId: 'rockmite', weight: 14 },
      { enemyId: 'drone', weight: 12 },
      { enemyId: 'grub', weight: 10 },
      { enemyId: 'sentinel', weight: 8 },
    ],
    wildlife: [
      { animalId: 'burrowing_mammal', weight: 60 },
      { animalId: 'cave_beetle', weight: 40 },
    ],
  },

  'Frost highlands': {
    id: 'Frost highlands',
    name: 'Frost Highlands',
    description: 'Frigid mountainous terrain dusted with crystalline snow. Glacial beasts and rich silver veins.',
    dangerLevel: 3,
    depthRange: 'surface',
    palette: {
      skyColor: '#8ecae6',
      groundColor: '#d6e2e8',
      stoneColor: '#5e7280',
      wallColor: '#36434d',
      accentColor: '#a0e7e5',
    },
    vegetationDensity: 0.8,
    surfaceFeature: 'pine_needles',
    ores: [
      { oreId: 'silver_ore', weight: 45 },
      { oreId: 'iron', weight: 35 },
      { oreId: 'copper_ore', weight: 20 },
    ],
    hostiles: [
      { enemyId: 'crawler_frost', weight: 24 },
      { enemyId: 'hopper_frost', weight: 18 },
      { enemyId: 'stalker', weight: 16 },
      { enemyId: 'thornback', weight: 14 },
      { enemyId: 'spitter', weight: 12 },
      { enemyId: 'caster', weight: 16 },
    ],
    wildlife: [
      { animalId: 'ground_bird', weight: 50 },
      { animalId: 'burrowing_mammal', weight: 50 },
    ],
    ambientHazard: {
      type: 'cold',
      intensity: 1,
    },
  },

  'Fungal hollows': {
    id: 'Fungal hollows',
    name: 'Fungal Hollows',
    description: 'Subterranean grotto blooming with luminescent giant mushrooms, glowing spores, and gold veins.',
    dangerLevel: 3,
    depthRange: 'cavern',
    palette: {
      skyColor: '#1a1c2e',
      groundColor: '#3a2b4c',
      stoneColor: '#423753',
      wallColor: '#281f33',
      accentColor: '#9b5de5',
    },
    vegetationDensity: 2.2,
    surfaceFeature: 'giant_fungi',
    ores: [
      { oreId: 'gold_ore', weight: 35 },
      { oreId: 'coal', weight: 40 },
      { oreId: 'crystal', weight: 25 },
    ],
    hostiles: [
      { enemyId: 'crawler_fungal', weight: 28 },
      { enemyId: 'caster_fungal', weight: 22 },
      { enemyId: 'grub', weight: 18 },
      { enemyId: 'spitter', weight: 16 },
      { enemyId: 'hopper', weight: 16 },
    ],
    wildlife: [
      { animalId: 'cave_beetle', weight: 70 },
      { animalId: 'burrowing_mammal', weight: 30 },
    ],
    ambientHazard: {
      type: 'spores',
      intensity: 1,
    },
  },

  'Crystal depths': {
    id: 'Crystal depths',
    name: 'Crystal Depths',
    description: 'Deep subterranean caverns filled with resonant prismatic clusters and ancient guardians.',
    dangerLevel: 4,
    depthRange: 'cavern',
    palette: {
      skyColor: '#120d24',
      groundColor: '#605092',
      stoneColor: '#3e365e',
      wallColor: '#211c33',
      accentColor: '#ad9dff',
    },
    vegetationDensity: 0.2,
    surfaceFeature: 'crystals',
    ores: [
      { oreId: 'crystal', weight: 35 },
      { oreId: 'silver_ore', weight: 25 },
      { oreId: 'gold_ore', weight: 20 },
      { oreId: 'aether_crystal', weight: 20 },
    ],
    hostiles: [
      { enemyId: 'drone_crystal', weight: 35 },
      { enemyId: 'caster', weight: 35 },
      { enemyId: 'sentinel_crystal', weight: 30 },
    ],
    wildlife: [
      { animalId: 'cave_beetle', weight: 100 },
    ],
  },

  'Ashen depths': {
    id: 'Ashen depths',
    name: 'Ashen Depths',
    description: 'Subterranean volcanic mantle with dense obsidian crusts, cobalt deposits, and magma seams.',
    dangerLevel: 5,
    depthRange: 'deep_mantle',
    palette: {
      skyColor: '#2b0909',
      groundColor: '#4a1515',
      stoneColor: '#2e1c1c',
      wallColor: '#1a0d0d',
      accentColor: '#ff5722',
    },
    vegetationDensity: 0.0,
    surfaceFeature: 'obsidian_pillars',
    ores: [
      { oreId: 'cobalt_ore', weight: 40 },
      { oreId: 'obsidian', weight: 35 },
      { oreId: 'gold_ore', weight: 25 },
    ],
    hostiles: [
      { enemyId: 'crawler_ashen', weight: 24 },
      { enemyId: 'gunner_ashen', weight: 20 },
      { enemyId: 'brute', weight: 18 },
      { enemyId: 'thornback', weight: 14 },
      { enemyId: 'sentinel', weight: 14 },
      { enemyId: 'rockmite', weight: 10 },
    ],
    wildlife: [],
    ambientHazard: {
      type: 'heat',
      intensity: 2,
    },
  },
};

/** Lookup biome definition by name */
export function getBiomeDefinition(id: BiomeId): BiomeDefinition {
  return BIOMES[id] ?? BIOMES['Verdant frontier'];
}
