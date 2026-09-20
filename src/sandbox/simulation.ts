import { saleValue } from './registry/economy';
import { add, remove, count, ITEMS, markOnboarding, noteDiscovery, type WorldSave, type Inventory, type ItemId } from './model';
import { readTile, editTile } from './terrain';

/** Called only from the active Phaser simulation. Never uses wall-clock/offline time. */
export function advanceWorld(w: WorldSave, deltaMs: number) {
  if (!Number.isFinite(deltaMs) || deltaMs < 0 || deltaMs > 1000) throw new Error('Invalid simulation step.');
  w.elapsedMs = (w.elapsedMs ?? 0) + deltaMs;
  w.hunger = Math.max(0, (w.hunger ?? 100) - deltaMs / (27.5 * 60 * 10));
  if (w.meal) {
    w.meal.remainingMs = Math.max(0, w.meal.remainingMs - deltaMs);
    if (!w.meal.remainingMs) delete w.meal;
  }
  const f = w.furnace;
  if (f && f.remaining > 0 && f.stored < ITEMS[f.output].stack && f.fuelMs > 0) {
    const spent = Math.min(deltaMs, f.fuelMs);
    f.progressMs += spent;
    f.fuelMs -= spent;
    if (f.progressMs >= 10000) {
      f.progressMs -= 10000;
      f.remaining--;
      f.stored++;
      w.progress.craft++;
    }
  }
  const changed: { x: number; y: number }[] = [];
  for (const [key, crop] of Object.entries(w.crops ?? {}).slice(0, 128)) {
    const [x, y] = key.split(',').map(Number);
    if (readTile(w, x, y) !== 30) { delete w.crops![key]; continue; }
    if (w.elapsedMs - crop.plantedAt >= 90000) {
      editTile(w, x, y, 31); delete w.crops![key]; changed.push({ x, y });
    }
  }
  return changed;
}
export function collectFurnace(w: WorldSave, atBase: boolean) {
  if (!atBase) throw new Error('Return to the outpost furnace.');
  const f = w.furnace;
  if (!f?.stored) throw new Error('No finished bars yet.');
  if (!add(w.inventory, f.output, f.stored)) throw new Error('Pack full. Bars remain safe in the output slot.');
  const n = f.stored; f.stored = 0;
  markOnboarding(w, 'smelted');
  const discovered = noteDiscovery(w, 'item', f.output);
  return `Collected ${n} ${ITEMS[f.output].name}${discovered ? ` · ${discovered}` : ''}`;
}
export function storageTransfer(w: WorldSave, key: string, slot: number, deposit: boolean) {
  const [x, y] = key.split(',').map(Number);
  if (readTile(w, x, y) !== 20) throw new Error('Storage no longer exists.');
  w.containers ??= {};
  const box = w.containers[key] ?? Array.from({ length: 16 }, () => null);
  const source = structuredClone(deposit ? w.inventory : box);
  const target = structuredClone(deposit ? box : w.inventory);
  const stack = source[slot];
  if (!stack || !add(target, stack.id, stack.count)) throw new Error('No stack selected or destination full.');
  source[slot] = null;
  w.inventory = deposit ? source : target;
  w.containers[key] = deposit ? target : source;
  return 'Stack transferred';
}
export function sortPack(inv: Inventory) {
  const stacks = inv.slice(8).filter(s => s !== null).sort((a, b) => a.id.localeCompare(b.id));
  inv.splice(8, 24, ...stacks, ...Array.from({ length: 24 - stacks.length }, () => null));
}
export function quickStack(w: WorldSave, keys: string[]) {
  let moved = 0;
  for (const key of keys.slice(0, 8)) {
    const [x, y] = key.split(',').map(Number);
    if (readTile(w, x, y) !== 20) continue;
    const box = w.containers?.[key]; if (!box) continue;
    for (let i = 8; i < w.inventory.length; i++) {
      const s = w.inventory[i];
      if (s && count(box, s.id) > 0 && add(box, s.id, s.count)) { moved += s.count; w.inventory[i] = null; }
    }
  }
  return `Stacked ${moved} items (hotbar preserved)`;
}
export function harvestCrop(w: WorldSave, x: number, y: number) {
  if (readTile(w, x, y) !== 31) throw new Error('Crop is not ready.');
  const inv = structuredClone(w.inventory);
  if (!add(inv, 'vegetable_raw', 2) || !add(inv, 'seeds_crop', 2)) throw new Error('Make room for crops and seeds.');
  w.inventory = inv; editTile(w, x, y, 0); delete w.crops?.[`${x},${y}`];
  return 'Harvested 2 greens and 2 seeds';
}
export function sellResource(w: WorldSave, id: ItemId, amount: number) {
  const value = saleValue(id, amount);
  if (!value || !remove(w.inventory, id, amount)) throw new Error('Choose a complete sale bundle from your pack.');
  w.coins += value;
  return `Sold ${amount} ${ITEMS[id].name} for ${value} coins`;
}
export { saleValue } from './registry/economy';
