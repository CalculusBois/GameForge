import { add, type WorldSave, type ItemId } from './model';
import { SHOP_CATALOG } from './registry/economy';
export function listingKey(p: { listingId?: string; itemId: string }) {
  return p.listingId ?? p.itemId;
}
export function buySupply(w: WorldSave, item: string, nearBase: boolean) {
  const listing = SHOP_CATALOG.find(p => listingKey(p) === item);
  if (!nearBase || !listing) throw new Error('Return to the outpost shop.');
  if (w.coins < listing.buyPrice) throw new Error('Not enough coins.');
  const next = structuredClone(w.inventory);
  if (!add(next, listing.itemId, listing.count)) throw new Error('Pack full; coins kept.');
  for (const extra of listing.extras ?? []) {
    if (!add(next, extra.itemId as ItemId, extra.count)) throw new Error('Pack full; coins kept.');
  }
  w.inventory = next;
  w.coins -= listing.buyPrice;
  return `Bought ${listing.name}`;
}
