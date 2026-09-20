/**
 * Food, Farming, and Cooking Registry for GameForge.
 * Defines ingredients, cooking recipes, hunger restoration values,
 * and nutritional status buffs.
 */

import type { ItemId } from './items';

export interface FoodProfile {
  id: ItemId;
  name: string;
  hungerRestore: number; // 0-100 hunger scale
  healthRestore: number; // Immediate HP restored
  buff?: {
    name: string;
    description: string;
    type: 'speed' | 'regen' | 'damage' | 'defense' | 'vitality';
    durationSeconds: number;
    magnitude: number; // e.g. 0.20 = +20%
  };
}

export interface CookingRecipe {
  id: string;
  name: string;
  ingredients: Partial<Record<ItemId, number>>;
  output: { id: ItemId; count: number };
  cookingTimeSeconds: number;
}

export const FOOD_PROFILES: Record<string, FoodProfile> = {
  // Raw Ingredients (Minor nutrition, can be eaten raw in emergency)
  berries: {
    id: 'berries',
    name: 'Wild berries',
    hungerRestore: 8,
    healthRestore: 4,
  },
  mushroom_edible: {
    id: 'mushroom_edible',
    name: 'Cave mushroom',
    hungerRestore: 10,
    healthRestore: 5,
  },
  meat_raw: {
    id: 'meat_raw',
    name: 'Raw meat',
    hungerRestore: 12,
    healthRestore: 0, // Potential risk if raw
  },
  vegetable_raw: {
    id: 'vegetable_raw',
    name: 'Field greens',
    hungerRestore: 10,
    healthRestore: 6,
  },

  // Cooked Dishes (Substantial nutrition and beneficial status effects)
  meat_cooked: {
    id: 'meat_cooked',
    name: 'Roasted skewer',
    hungerRestore: 35,
    healthRestore: 20,
    buff: {
      name: 'Prowess',
      description: '+15% physical weapon damage',
      type: 'damage',
      durationSeconds: 180,
      magnitude: 0.15,
    },
  },
  mushrooms_grilled: {
    id: 'mushrooms_grilled',
    name: 'Spiced mushrooms',
    hungerRestore: 28,
    healthRestore: 18,
    buff: {
      name: 'Spore Glow',
      description: 'Slow passive health regeneration (+2 HP/sec)',
      type: 'regen',
      durationSeconds: 180,
      magnitude: 2,
    },
  },
  stew_vegetable: {
    id: 'stew_vegetable',
    name: 'Hearty harvest stew',
    hungerRestore: 52,
    healthRestore: 35,
    buff: {
      name: 'Vigor',
      description: '+25 max health',
      type: 'vitality',
      durationSeconds: 300,
      magnitude: 25,
    },
  },
  dish_berry: {
    id: 'dish_berry',
    name: 'Crisp berry tart',
    hungerRestore: 32,
    healthRestore: 15,
    buff: {
      name: 'Fleetfoot',
      description: '+20% movement speed',
      type: 'speed',
      durationSeconds: 180,
      magnitude: 0.2,
    },
  },
  meal_mixed: {
    id: 'meal_mixed',
    name: 'Frontier skillet feast',
    hungerRestore: 68,
    healthRestore: 45,
    buff: {
      name: 'Ironclad Gut',
      description: '+4 armor defense',
      type: 'defense',
      durationSeconds: 300,
      magnitude: 4,
    },
  },
  meal_expedition: {
    id: 'meal_expedition',
    name: 'Expedition trail rations',
    hungerRestore: 85,
    healthRestore: 60,
    buff: {
      name: 'Endurance Mastery',
      description: '+6 armor defense',
      type: 'defense',
      durationSeconds: 480,
      magnitude: 6,
    },
  },
};

export const COOKING_RECIPES: CookingRecipe[] = [
  {
    id: 'cook_meat',
    name: 'Roast skewer',
    ingredients: { meat_raw: 1, wood: 1 },
    output: { id: 'meat_cooked', count: 1 },
    cookingTimeSeconds: 4,
  },
  {
    id: 'cook_mushrooms',
    name: 'Spice mushrooms',
    ingredients: { mushroom_edible: 2, herb: 1 },
    output: { id: 'mushrooms_grilled', count: 1 },
    cookingTimeSeconds: 4,
  },
  {
    id: 'cook_stew',
    name: 'Hearty harvest stew',
    ingredients: { vegetable_raw: 2, herb: 2, mushroom_edible: 1 },
    output: { id: 'stew_vegetable', count: 1 },
    cookingTimeSeconds: 6,
  },
  {
    id: 'cook_berry_dish',
    name: 'Crisp berry tart',
    ingredients: { berries: 3, wood: 1 },
    output: { id: 'dish_berry', count: 1 },
    cookingTimeSeconds: 4,
  },
  {
    id: 'cook_mixed_meal',
    name: 'Frontier skillet feast',
    ingredients: { meat_raw: 1, vegetable_raw: 1, mushroom_edible: 1 },
    output: { id: 'meal_mixed', count: 1 },
    cookingTimeSeconds: 7,
  },
  {
    id: 'cook_expedition_meal',
    name: 'Expedition trail rations',
    ingredients: { meat_cooked: 1, dish_berry: 1, herb: 2 },
    output: { id: 'meal_expedition', count: 1 },
    cookingTimeSeconds: 8,
  },
];

/** Check if item ID is a registered consumable food */
export function getFoodProfile(id: string): FoodProfile | undefined {
  return FOOD_PROFILES[id];
}
