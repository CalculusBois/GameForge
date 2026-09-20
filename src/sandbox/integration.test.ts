import { describe, it, expect } from 'vitest';
import { newWorld, DEFAULT_WORLD, initialBundle, add, count, smelt, eatFood, cookDish, derivePlayerStats, RECIPES, noteDiscovery } from './model';
import { advanceWorld, collectFurnace, storageTransfer, harvestCrop, saleValue } from './simulation';
import { validateBundle } from './persistence';
import { exampleSpec } from '../creator/example';
import { validateSpec } from '../creator/spec';
import { readTile, editTile, baseTile } from './terrain';
import { baseTile as legacy } from './terrain-v1';
const fresh = () => newWorld('test', DEFAULT_WORLD);
describe('connected progression regressions', () => {
 it('preserves generator 1 tiles exactly and exposes starter copper in new worlds', () => {
  const w = fresh(); w.generator = 1;
  for(let x=-50;x<150;x+=3) for(let y=18;y<150;y+=5) expect(readTile(w,x,y)).toBe(legacy(w.settings,x,y));
  expect(baseTile(w.settings,27,22)).toBe(10);
 });
 it('removes the cobalt/obsidian circular recipe', () => {
  expect(RECIPES.find(r=>r.output.id==='pickaxe_cobalt')?.ingredients.obsidian).toBeUndefined();
 });
 it('reloads a partial furnace batch without consuming inputs or producing output twice', () => {
  let w=fresh(); add(w.inventory,'station_furnace',1); add(w.inventory,'copper_ore',4); add(w.inventory,'coal',1); smelt(w,'copper_ore','coal',2,true);
  for(let i=0;i<15;i++) advanceWorld(w,1000);
  w=JSON.parse(JSON.stringify(w));
  for(let i=0;i<5;i++) advanceWorld(w,1000);
  expect(w.furnace?.stored).toBe(2); expect(count(w.inventory,'copper_ore')).toBe(0);
  collectFurnace(w,true); expect(()=>collectFurnace(w,true)).toThrow();
  for(let i=0;i<20;i++) advanceWorld(w,1000);
  expect(count(w.inventory,'copper_bar')).toBe(2);
 });
 it('uses 27.5 minutes of simulation time to empty hunger with bounded food buffs', () => {
  const w=fresh(); for(let i=0;i<1650;i++) advanceWorld(w,1000);
  expect(w.hunger).toBeCloseTo(0,5);
  add(w.inventory,'dish_berry',2); eatFood(w,'dish_berry'); eatFood(w,'dish_berry');
  expect(w.hunger).toBeCloseTo(64); expect(derivePlayerStats(w).speedMultiplier).toBeCloseTo(1.2);
  expect(w.meal?.remainingMs).toBe(180000);
 });
 it('requires a cooking station and retains ingredients on failure', () => {
  const w=fresh(); add(w.inventory,'meat_raw',1); add(w.inventory,'wood',1);
  expect(()=>cookDish(w,'cook_meat')).toThrow(/station/); expect(count(w.inventory,'meat_raw')).toBe(1);
  expect(()=>cookDish(w,'cook_meat',true)).toThrow(/Cooking station/);
  add(w.inventory,'station_cooking',1);
  cookDish(w,'cook_meat',true); expect(count(w.inventory,'meat_cooked')).toBe(1);
 });
 it('transfers storage stacks atomically and preserves contents across reload', () => {
  let w=fresh(); editTile(w,40,20,20); storageTransfer(w,'40,20',0,true);
  w=JSON.parse(JSON.stringify(w)); expect(count(w.inventory,'pickaxe')).toBe(0);
  storageTransfer(w,'40,20',0,false); expect(count(w.inventory,'pickaxe')).toBe(1);
  expect(()=>storageTransfer(w,'40,20',0,false)).toThrow();
 });
 it('grows crops on simulation time and grants harvest once', () => {
  const w=fresh(); editTile(w,40,20,30); w.crops={'40,20':{plantedAt:0}};
  for(let i=0;i<90;i++) advanceWorld(w,1000);
  expect(readTile(w,40,20)).toBe(31); harvestCrop(w,40,20);
  expect(count(w.inventory,'vegetable_raw')).toBe(2); expect(()=>harvestCrop(w,40,20)).toThrow();
 });
 it('persists forged bosses on the world save through serialize and reopen', () => {
  const b=initialBundle();
  const spec=structuredClone(exampleSpec);
  b.worlds[b.active].creations=[{spec:validateSpec(spec),x:400,y:200,defeated:false}];
  const restored=JSON.parse(JSON.stringify(b));
  validateBundle(restored);
  const saved=restored.worlds[restored.active].creations?.[0];
  expect(saved?.spec.id).toBe(spec.id);
  expect(saved?.spec.lifetime).toBe('world');
 });
 it('prevents gold-ore sales and individual timber rounding', () => {
  expect(saleValue('wood',1)).toBe(0); expect(saleValue('wood',20)).toBe(1);
  expect(saleValue('gold_ore',99)).toBe(0); expect(saleValue('gold_bar',99)).toBe(0);
 });
 it('rejects corrupted permanent upgrade counts instead of loading them', () => {
  const b=initialBundle(); b.worlds[b.active].upgrades!.vitalityCores=100;
  expect(()=>validateBundle(b)).toThrow();
 });
});

describe('finite lava basins', () => {
 it('samples 1–3% deep coverage with solid basin boundaries and no shallow lava', () => {
  let lava=0,total=0;
  for(const seed of ['LUMEN-01','BASIN-02','BASIN-03']) {
   const settings={...DEFAULT_WORLD,seed};
   for(let x=-200;x<200;x++) for(let y=115;y<157;y++) { total++; if(baseTile(settings,x,y)===23) {
    lava++;
    if(baseTile(settings,x,y+1)!==23) expect(baseTile(settings,x,y+1)).toBe(2);
   } }
   for(let x=-100;x<100;x+=5) for(let y=0;y<115;y+=3) expect(baseTile(settings,x,y)).not.toBe(23);
  }
  expect(lava/total).toBeGreaterThan(.01); expect(lava/total).toBeLessThan(.03);
  console.info(`Lava sample: ${lava}/${total} = ${(100*lava/total).toFixed(2)}%`);
 });
});

import { buyPart, buyPack, equipPart, packPrice, gunSkin } from './customization';
import { MODULAR_WARDROBE } from './registry/cosmetics';
import { gunTextureKey, heldGunTextureKey } from './itemIcons';
import { bossSites } from './bossSites';
describe('cosmetic transactions and encounter geometry', () => {
 it('credits owned parts and charges a pack only once, with no stat changes', () => {
  const b=initialBundle(),w=b.worlds[b.active];w.coins=2000;
  const part=Object.values(MODULAR_WARDROBE).find(p=>p.price>0)!;
  buyPart(b,part.id); const price=packPrice(b,part.setName);const coins=w.coins;
  buyPack(b,part.setName);expect(w.coins).toBe(coins-price);
  buyPack(b,part.setName);expect(w.coins).toBe(coins-price);
  const stats=derivePlayerStats(w);equipPart(b,part.id);gunSkin(b,'skin_desert_camo','blaster',true);
  gunSkin(b,'skin_neon_synth','carbine',true);
  expect(derivePlayerStats(w)).toEqual(stats);expect(()=>validateBundle(b)).not.toThrow();
  expect(gunTextureKey('blaster','skin_neon_synth')).not.toBe(gunTextureKey('blaster'));
  expect(heldGunTextureKey('blaster')).toBe('held-gun-blaster');
  expect(heldGunTextureKey('blaster','skin_neon_synth')).toContain('held-gun-blaster');
 });
 it('announces new recipes only on first discovery', () => {
  const w=fresh();
  expect(noteDiscovery(w,'item','copper_ore')).toMatch(/New recipes/);
  expect(noteDiscovery(w,'item','copper_ore')).toBe('');
 });
 it('creates three distinct safe arenas away from spawn', () => {
  for(const seed of ['LUMEN-01','BASIN-02','BASIN-03']) {
   const w=newWorld('w',{...DEFAULT_WORLD,seed}),sites=bossSites(w.settings);
   expect(sites).toHaveLength(3);
   for(const site of sites) { expect(Math.abs(site.x)).toBeGreaterThan(100); for(let dx=-15;dx<=15;dx++) {expect(readTile(w,site.x+dx,site.floor)).toBe(2);expect(readTile(w,site.x+dx,site.floor-2)).toBe(0);} }
  }
 });
 it('places boss-mode shrines closer to spawn', () => {
  const explorer=bossSites(newWorld('e',{...DEFAULT_WORLD,seed:'LUMEN-01'}).settings);
  const boss=bossSites(newWorld('b',{...DEFAULT_WORLD,seed:'LUMEN-01',difficulty:'boss'}).settings);
  expect(boss).toHaveLength(3);
  expect(Math.min(...boss.map(s=>Math.abs(s.x)))).toBeLessThanOrEqual(Math.min(...explorer.map(s=>Math.abs(s.x))));
  expect(Math.max(...boss.map(s=>Math.abs(s.x)))).toBeLessThan(140);
 });
});

import { buySupply, listingKey } from './shop';
import { SHOP_CATALOG } from './registry/economy';
describe('supply economy', () => {
 it('charges exactly once for the listed quantity and has no direct resale profit', () => {
  for(const listing of SHOP_CATALOG) {
   const w=fresh();w.coins=100;
   const before=count(w.inventory,listing.itemId);buySupply(w,listingKey(listing),true);
   expect(count(w.inventory,listing.itemId)).toBe(before+listing.count);
   for (const extra of listing.extras ?? []) expect(count(w.inventory,extra.itemId)).toBe(extra.count);
   expect(w.coins).toBe(100-listing.buyPrice);
   expect(saleValue(listing.itemId,listing.count)).toBeLessThan(listing.buyPrice);
  }
 });
 it('keeps coins when a décor pack cannot fit extras', () => {
  const w=fresh();w.coins=80;
  for(let i=0;i<w.inventory.length;i++) if(!w.inventory[i]) w.inventory[i]={id:'stone',count:99};
  expect(()=>buySupply(w,'pack_decor',true)).toThrow(/Pack full/);
  expect(w.coins).toBe(80);
 });
});
