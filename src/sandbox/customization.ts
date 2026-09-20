import { type Bundle } from './model';
import { MODULAR_WARDROBE, WEAPON_SKINS, type WardrobeSlot } from './registry/cosmetics';
export const STARTER_PARTS = ['frontier_helm','frontier_chest','frontier_gloves','frontier_boots'];
export const GUN_FAMILIES = ['blaster','carbine','blaster_burst','blaster_scatter','rifle_rail'] as const;
export function wardrobe(b: Bundle) {
  b.profile.parts ??= STARTER_PARTS.filter(id => MODULAR_WARDROBE[id]);
  b.profile.outfit ??= {};
  b.profile.gunSkins ??= ['skin_brushed_steel'];
  b.profile.guns ??= {};
  return b.profile;
}
export function packPrice(b: Bundle, setName: string) {
  const owned = b.profile.parts ?? STARTER_PARTS;
  const parts = Object.values(MODULAR_WARDROBE).filter(p => p.setName === setName);
  const remaining = parts.filter(p => !owned.includes(p.id));
  if (!remaining.length || parts.every(p => p.price === 0)) return 0;
  const discounted = Math.ceil(remaining.reduce((n,p)=>n+p.price,0)*.85);
  return remaining.length === parts.length ? Math.max(300, discounted) : discounted;
}
export function buyPart(b: Bundle, id: string) {
  const p=wardrobe(b), part=MODULAR_WARDROBE[id];
  if(!part) throw new Error('Unknown cosmetic part.');
  if(p.parts!.includes(id)) return 'Already owned';
  const w=b.worlds[b.active]; if(w.coins<part.price) throw new Error('Not enough coins.');
  w.coins-=part.price; p.parts!.push(id); return `Unlocked ${part.name}`;
}
export function buyPack(b: Bundle, setName: string) {
  const p=wardrobe(b), parts=Object.values(MODULAR_WARDROBE).filter(p=>p.setName===setName), price=packPrice(b,setName);
  if(!parts.length) throw new Error('Unknown pack.');
  const w=b.worlds[b.active]; if(w.coins<price) throw new Error('Not enough coins.');
  w.coins-=price; p.parts=[...new Set([...p.parts!,...parts.map(p=>p.id)])];
  return `Unlocked ${setName}; owned parts credited`;
}
export function equipPart(b: Bundle, id: string) {
  const p=wardrobe(b), part=MODULAR_WARDROBE[id];
  if(!part || !p.parts!.includes(id)) throw new Error('Unlock this part first.');
  p.outfit![part.slot as WardrobeSlot]=id; return `Equipped ${part.name}`;
}
export function gunSkin(b: Bundle, id: string, gun: string, buy: boolean) {
  const p=wardrobe(b), skin=WEAPON_SKINS[id];
  if(!skin || !GUN_FAMILIES.includes(gun as typeof GUN_FAMILIES[number])) throw new Error('Unknown gun appearance.');
  if(buy && !p.gunSkins!.includes(id)) {
    const w=b.worlds[b.active]; if(w.coins<skin.price) throw new Error('Not enough coins.');
    w.coins-=skin.price; p.gunSkins!.push(id);
  }
  if(!p.gunSkins!.includes(id)) throw new Error('Unlock this skin first.');
  p.guns![gun]=id; return `${skin.name} equipped`;
}
