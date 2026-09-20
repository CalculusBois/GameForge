/**
 * Central Economy and Vendor Pricing Registry for GameForge.
 * Formulates shop catalog, buying/selling price balance, bulk trade bonuses,
 * enemy bounty rewards, chest loot, and objective payouts.
 */

import { ITEMS, type ItemId } from './items';

export interface ShopListing {
  itemId: ItemId;
  name: string;
  count: number;
  buyPrice: number; // Cost in gold coins to purchase
  stockInfinite?: boolean;
  category: 'consumable' | 'resource' | 'building' | 'gear';
}

export const SHOP_CATALOG: ShopListing[] = [
  { itemId: 'tonic', name: 'Field tonic', buyPrice: 18, count: 1, stockInfinite: true, category: 'consumable' },
  { itemId: 'potion_mana', name: 'Aether draught', buyPrice: 24, count: 1, stockInfinite: true, category: 'consumable' },
  { itemId: 'torch', name: 'Lumen torches (×4)', buyPrice: 8, count: 4, stockInfinite: true, category: 'building' },
  { itemId: 'seeds_crop', name: 'Field crop seeds', buyPrice: 6, count: 1, stockInfinite: true, category: 'resource' },
  { itemId: 'wood', name: 'Timber pack (×10)', buyPrice: 15, count: 10, stockInfinite: true, category: 'resource' },
  { itemId: 'scrap', name: 'Scrap bundle (×5)', buyPrice: 35, count: 5, stockInfinite: true, category: 'resource' },
  { itemId: 'coal', name: 'Smelting coal (×5)', buyPrice: 15, count: 5, stockInfinite: true, category: 'resource' },
  { itemId: 'rope', name: 'Climbing rope (×3)', buyPrice: 12, count: 3, stockInfinite: true, category: 'building' },
];

export const BULK_SALE_RULES = {
  minBulkQuantity: 20,
  bulkBonusMultiplier: 1.1, // +10% bonus when selling 20 or more units at once
};

/** Calculate vendor sell return for a given quantity of an item */
export function calculateSellValue(unitValue: number, quantity: number): number {
  if (quantity <= 0 || unitValue <= 0) return 0;
  let total = Math.floor(unitValue * quantity);
  if (quantity >= BULK_SALE_RULES.minBulkQuantity) {
    total = Math.floor(total * BULK_SALE_RULES.bulkBonusMultiplier);
  }
  return total;
}

export const OBJECTIVE_REWARDS = {
  stone: { id: 'stone', name: 'Mine 12 stone blocks', total: 12, reward: 40 },
  kills: { id: 'kills', name: 'Defeat 4 hostile creatures', total: 4, reward: 60 },
  biome: { id: 'biome', name: 'Discover another biome', total: 1, reward: 40 },
  chest: { id: 'chest', name: 'Open a treasure chest', total: 1, reward: 45 },
  craft: { id: 'craft', name: 'Craft a weapon or upgraded tool', total: 1, reward: 60 },
  // Expanded Objectives
  smelt: { id: 'smelt', name: 'Smelt refined metal bars', total: 5, reward: 50 },
  cook: { id: 'cook', name: 'Cook a hearty hot meal', total: 1, reward: 45 },
  boss: { id: 'boss', name: 'Defeat a regional boss', total: 1, reward: 150 },
  totem: { id: 'totem', name: 'Deploy an outpost totem', total: 1, reward: 50 },
} as const;

export function saleValue(id: ItemId, n: number) {
  if (!Number.isSafeInteger(n) || n < 1 || ['gold_ore', 'gold_bar', 'vitality_core', 'mana_core'].includes(id)) return 0;
  const bundle: Partial<Record<ItemId, [number, number]>> = { wood: [20, 1], dirt: [40, 1], stone: [20, 1], herb: [10, 1], scrap: [10, 2] };
  const rule = bundle[id];
  if (rule) return n % rule[0] === 0 ? n / rule[0] * rule[1] : 0;
  // Crafted/reclaimed equipment and buildings have no resale path.
  return ['resource'].includes(ITEMS[id].category) ? Math.floor(ITEMS[id].value * n) : 0;
}

export const ENEMY_REWARDS = { ordinary: 3, strong: 8 };
export const CHEST_REWARD = 20;
export const BOSS_REWARDS: Record<string,number> = { rust_colossus: 90, mycelial_sovereign: 120, aether_warden: 150 };
