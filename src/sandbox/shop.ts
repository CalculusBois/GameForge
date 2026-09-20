import { add, type WorldSave } from './model';
import { SHOP_CATALOG } from './registry/economy';
export function buySupply(w: WorldSave, item: string, nearBase: boolean) {
 const listing=SHOP_CATALOG.find(p=>p.itemId===item);
 if(!nearBase||!listing)throw new Error('Return to the outpost shop.');
 if(w.coins<listing.buyPrice)throw new Error('Not enough coins.');
 if(!add(w.inventory,listing.itemId,listing.count))throw new Error('Pack full; coins kept.');
 w.coins-=listing.buyPrice;return `Bought ${listing.name}`;
}
