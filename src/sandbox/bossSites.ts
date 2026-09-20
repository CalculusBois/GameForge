import { type WorldSettings } from './model';
import { biome, surface } from './terrain';
export interface BossSite { id: string; x: number; floor: number; }
const bySettings=new WeakMap<WorldSettings,BossSite[]>();
const cache=new Map<string,BossSite[]>();
export function bossSites(s: WorldSettings): BossSite[] {
 const known=bySettings.get(s);if(known)return known;
 const key=JSON.stringify(s); const cached=cache.get(key); if(cached){bySettings.set(s,cached);return cached;}
 const sites:BossSite[]=[];
 for(const [id,target,depth] of [['rust_colossus','Rust wastes',0],['mycelial_sovereign','Fungal hollows',40],['aether_warden','Crystal depths',48]] as const) {
  for(let n=0;n<120;n++) {
   const x=(id==='aether_warden'?-1:1)*(220+n*32);
   const floor=surface(s,x)+depth;
   if(biome(s,x,floor)===target && sites.every(p=>Math.abs(p.x-x)>40)) {sites.push({id,x,floor});break;}
  }
 }
 bySettings.set(s,sites);cache.set(key,sites);if(cache.size>8)cache.delete(cache.keys().next().value!);return sites;
}
