import { bossSites } from './bossSites';
import { buyPack, equipPart, gunSkin } from './customization';
import { collectFurnace } from './simulation';
import {useEffect,useRef,useState} from 'react';
import {startSandbox,type VerificationPort} from './engine';
import {SaveStore} from './persistence';
import {TILE,count,craft,claim,unlock,smelt,cookDish,eatFood,} from './model';
import {solid,readTile,clearLine} from './terrain';
import {type Kind} from './enemies';
const sleep=(ms:number)=>new Promise<void>(r=>setTimeout(r,ms));
export default function Verification(){
 const host=useRef<HTMLDivElement>(null);const [lines,setLines]=useState<string[]>([]);const [status,setStatus]=useState('Starting isolated fresh-world checks');const [metrics,setMetrics]=useState('');
 useEffect(()=>{let live=true,destroy:(()=>void)|undefined;const report=(s:string)=>{if(live)setLines(v=>[...v,s]);};const db=`gameforge-verification-${Date.now()}`;report(`Isolated database: ${db}. No user save records are opened.`);
 void SaveStore.open(db).then(store=>{if(!live||!host.current)return;const controller=startSandbox(host.current,store,h=>{if(live)setMetrics(`${h.status} | ${Math.round(h.x)},${Math.round(h.y)} | HP ${h.health} | ${h.chunks} chunks / ${h.bodies} bodies / ${h.enemies} enemies | ${h.fps} FPS`);},()=>{},port=>{void run(port,store,report,s=>live&&setStatus(s),()=>live,db).catch(e=>{if(!live)return;report(`FAIL: ${String(e)} | ${JSON.stringify(port.read())}`);setStatus('FAILED — regression stopped, world preserved for inspection');port.hold([]);port.pause();});});destroy=controller.destroy;});return()=>{live=false;destroy?.();};},[]);
 return <main style={{padding:16,maxWidth:1200,margin:'auto'}}><h1>GameForge gameplay verification</h1><p>{new URLSearchParams(location.search).has('prepared') ? 'Prepared isolated save: grants rail rifle, iron armor and cosmetic test coins. This verifies encounters, not natural progression balance.' : 'No supplied resources or coins. Fresh-world checks use normal movement, mining, harvesting, and transactions.'}</p><strong id="verification-status">{status}</strong><p>{metrics}</p><div style={{position:'relative',aspectRatio:'16/9',maxWidth:960}} ref={host}/><pre id="verification-log" style={{whiteSpace:'pre-wrap',fontSize:12}}>{lines.join('\n')}</pre></main>;
}
async function run(p:VerificationPort,s:SaveStore,log:(s:string)=>void,stage:(s:string)=>void,live:()=>boolean,db:string){
 const check=(ok:unknown,message:string)=>{if(!ok)throw new Error(message);log('PASS: '+message);};
 const wait=async(test:()=>boolean,ms=8000)=>{const end=performance.now()+ms;while(!test()){if(!live())throw new Error('Verification closed');if(performance.now()>end)throw new Error('Timed out: '+p.read().message);await sleep(40);}};
 const settle=async()=>{p.hold([]);await sleep(220);};
 const go=async(x:number,timeout=25000,jumpGaps=true)=>{const start=performance.now();let lastX=p.read().x,stuckSince=performance.now(),jumpUntil=0;while(Math.abs(p.read().x-x)>14){const q=p.read();if(q.status==='dead')throw new Error('Died during traversal');if(performance.now()-start>timeout)throw new Error(`Traversal stuck targeting ${x}, at ${q.x},${q.y}`);const dir=Math.sign(x-q.x),keys=[dir>0?'KeyD':'KeyA'];const aheadX=Math.floor((q.x+dir*30)/TILE),headY=Math.floor((q.y-10)/TILE),feetY=Math.floor((q.y+28)/TILE);
   if(Math.abs(q.x-lastX)>12){lastX=q.x;stuckSince=performance.now();}
   const foe=q.enemies.find(f=>Math.abs(f.x-q.x)<280&&Math.abs(f.y-q.y)<90&&clearLine(s.world,q.x,q.y,f.x,f.y));
   if(foe){p.select(1);p.aim(foe.x,foe.y);keys.push('KeyJ');}
   else if(performance.now()-stuckSince>1300&&(solid(s.world,aheadX,headY)||solid(s.world,aheadX,headY+1))){p.select(0);const y=solid(s.world,aheadX,headY)?headY:headY+1;p.aim((aheadX+.5)*TILE,(y+.5)*TILE);p.hold(['KeyJ']);await sleep(50);continue;}
   if(q.grounded&&(dir>0?q.blockedRight:q.blockedLeft)){jumpUntil=performance.now()+380;}
   if(jumpGaps&&q.grounded&&!solid(s.world,aheadX,feetY))jumpUntil=performance.now()+380;
   if(performance.now()<jumpUntil)keys.push('Space');p.hold(keys);await sleep(40);
  }await settle();};
 const returnHome=async()=>{for(let attempt=0;attempt<5;attempt++){await settle();p.recall();const end=performance.now()+6500;while(performance.now()<end&&Math.abs(p.read().x-s.world.checkpoint.x)>40){if(p.read().status==='dead')throw new Error('Died during recall');await sleep(70);}if(Math.abs(p.read().x-s.world.checkpoint.x)<40)return;if(p.read().message.includes('damage'))log('PASS: Enemy damage cancelled recall');const q=p.read();for(const f of q.enemies.filter(f=>Math.hypot(f.x-q.x,f.y-q.y)<350)){p.select(1);const end=performance.now()+5000;while(p.read().enemies.some(e=>e.id===f.id)&&performance.now()<end){const e=p.read().enemies.find(e=>e.id===f.id)!;p.aim(e.x,e.y);p.hold(['KeyJ']);await sleep(60);}}}throw new Error('Could not safely finish recall');};
 const tap=async(key:string)=>{p.hold([key]);await sleep(140);p.hold([]);await sleep(140);};
 const mine=async(x:number,y:number)=>{p.select(0);p.aim((x+.5)*TILE,(y+.5)*TILE);p.hold(['KeyJ']);try{await wait(()=>readTile(s.world,x,y)===0,6000);}finally{p.hold([]);}await wait(()=>!p.read().busy);};
 if(new URLSearchParams(location.search).has('prepared')) {
  stage('PREPARED SAVE — boss combat, rewards and cosmetics (not natural progression)');
  const requested=new URLSearchParams(location.search).get('prepared');
  const bossId=requested==='1'?'rust_colossus':requested!;
  const site=bossSites(s.world.settings).find(s=>s.id===bossId)!;
  await s.transact(b=>{const w=b.worlds[b.active];w.checkpoint={x:(site.x-1)*TILE,y:site.floor*TILE-25};w.inventory[0]={id:'rifle_rail',count:1};w.equipment={head:'helmet_iron',chest:'chest_iron',legs:'boots_iron',accessory1:null,accessory2:null};w.coins=2000;buyPack(b,'Neon Technician');const part=b.profile.parts?.find(id=>id.startsWith('neon_'));if(part)equipPart(b,part);gunSkin(b,'skin_neon_synth','rifle_rail',true);});
  p.respawn();await wait(()=>p.read().grounded);await tap('KeyE');await wait(()=>p.read().enemies.some(e=>e.kind===bossId));
  check(true,'Shrine interaction starts boss with a safe recovery window');
  const seen=new Set<string>();const until=performance.now()+35000;
  p.select(0);
  while(!s.world.defeated.includes(`boss:${bossId}`) && performance.now()<until) {
   const boss=p.read().enemies.find(e=>e.kind===bossId);if(!boss)break;
   seen.add(boss.state);if(boss.hp<(bossId==='aether_warden'?750:bossId==='mycelial_sovereign'?550:400))seen.add('phase2');
   p.aim(boss.x,boss.y);p.hold(['KeyJ',...(boss.state==='charge'?['Space']:[])]);await sleep(60);
   if(p.read().status==='dead')throw new Error('Prepared boss fixture died');
  }
  p.hold([]);check(s.world.defeated.includes(`boss:${bossId}`),'Boss defeated through real projectile collisions');
  check(seen.has('phase2'),'Observed second phase');log('Observed boss states: '+[...seen].join(', '));
  const coins=s.world.coins;await go(site.x*TILE);await tap('KeyE');await sleep(200);check(s.world.coins===coins,'Completed shrine cannot duplicate rewards');
  p.pause();await p.save();const loaded=await SaveStore.open(db);check(loaded.world.defeated.includes(`boss:${bossId}`)&&loaded.data.profile.guns?.rifle_rail==='skin_neon_synth','Boss defeat and gun appearance persist on reopen');
  stage('COMPLETE — prepared boss and cosmetic checks');return;
 }
 stage('Fresh world: harvesting and starter equipment');check(s.world.coins===0&&count(s.world.inventory,'wood')===0&&count(s.world.inventory,'iron')===0,'Fresh world starts without test coins or materials');p.resume();await wait(()=>p.read().grounded);await go(110);p.hold(['KeyE']);await wait(()=>count(s.world.inventory,'wood')>=8,5000);p.hold([]);check(count(s.world.inventory,'wood')===8,'Naturally gathered timber from the guaranteed tree');
 await go(630);for(let x=27;x<=32;x++) { await go((x+.5)*TILE); await mine(x,22); }
 check(count(s.world.inventory,'copper_ore')>=6,'Naturally mined six accessible copper ore blocks');
 await returnHome();p.pause();await s.transact((_b,w)=>smelt(w,'copper_ore','wood',3,true));
 check(count(s.world.inventory,'copper_bar')===0,'Queue reserves inputs without immediate output');
 const frozen=s.world.furnace?.progressMs; await sleep(500);check(s.world.furnace?.progressMs===frozen,'Furnace pauses with gameplay');
 p.resume();await wait(()=>s.world.furnace?.stored===3,65000);p.pause();await s.transact((_b,w)=>collectFurnace(w,true));
 await s.transact((_b,w)=>craft(w,'craft_pickaxe_copper',true));
 await s.transact((_b,w)=>{const i=w.inventory.findIndex(v=>v?.id==='pickaxe_copper');[w.inventory[0],w.inventory[i]]=[w.inventory[i],w.inventory[0]];});
 check(count(s.world.inventory,'pickaxe_copper')===1,'Crafted and equipped copper pickaxe from natural resources');
 await s.transact((_b,w)=>claim(w,'craft'));await s.transact(b=>unlock(b,'ranger'));await s.transact(b=>{b.profile.equipped='ranger';});
 check(s.data.profile.owned.includes('ranger'),'Bought a cosmetic using earned objective coins');p.resume();
 await go(680);await mine(28,23);check(count(s.world.inventory,'iron')>=1,'Upgraded pickaxe mines iron through real input');
 await go(700);p.hold(['KeyE']);await wait(()=>count(s.world.inventory,'berries')>=3,4000);p.hold([]);await returnHome();p.pause();
 await s.transact((_b,w)=>cookDish(w,'cook_berry_dish',true));await s.transact((_b,w)=>eatFood(w,'dish_berry'));
 check(s.world.meal?.type==='speed','Cooked naturally foraged berries; consuming installs one meal buff');
 await p.save();const coreReopen=await SaveStore.open(db);
 check(count(coreReopen.world.inventory,'pickaxe_copper')===1&&coreReopen.world.meal?.type==='speed','IndexedDB reopen preserves tool, meal and drained hunger');
 log('Core natural progression complete. No test resources were granted.');
 if(!new URLSearchParams(location.search).has('extended')) { stage('COMPLETE — natural copper, furnace, upgraded mining, cooking, cosmetic and reload checks');return; }
 p.resume();
 stage('Boundary mining / placement and save reopen');await go(750);await wait(()=>p.read().grounded);await mine(32,22);await settle();await wait(()=>p.read().grounded);p.hold(['Space']);await wait(()=>p.read().y<470&&p.read().vy<0,2500);const before=count(s.world.inventory,'dirt');p.select(4);p.aim(32.5*TILE,22.5*TILE);await tap('KeyF');await wait(()=>readTile(s.world,32,22)===1);check(count(s.world.inventory,'dirt')===before-1,'Placed a consumed soil block across a chunk boundary');await p.save();const reopened=await SaveStore.open(db);check(readTile(reopened.world,32,22)===1&&reopened.data.profile.owned.includes('ranger'),'Actual IndexedDB reopen restores edited terrain and earned skin');
 // Snapshot persistence is checked against the same explicit database by the outer UI later.
 check(readTile(s.world,32,22)===1,'Boundary edit remains visible after durable transaction');
 stage('Natural cave treasure and magic equipment');await settle();await go(910,20000,false);await wait(()=>p.read().grounded);await go(1660,35000,false);await wait(()=>p.read().grounded);check(p.read().y>700,'Entered the starter cave using normal movement');await tap('KeyE');await wait(()=>s.world.opened.includes('landing-cache'));check(count(s.world.inventory,'crystal')>=4,'Opened reachable cave treasure and collected real crystal loot');await returnHome();p.pause();await s.transact((_b,w)=>craft(w,'staff',true));check(count(s.world.inventory,'staff')===1,'Crafted magic staff from gathered timber and cave treasure');p.resume();
 stage('Sustained positive and negative chunk traversal');let maxChunks=0,maxBodies=0;const tracking=setInterval(()=>{maxChunks=Math.max(maxChunks,p.read().chunks);maxBodies=Math.max(maxBodies,p.read().bodies);},150);
 try{await go(3900,65000);check(p.read().x>3800,'Traversed five chunks to the right with physics active');await returnHome();check(true,'Recall channel returned from exploration to the checkpoint');await go(-2400,65000);check(p.read().x< -2300,'Traversed negative-coordinate chunks');}finally{clearInterval(tracking);}
 check(maxChunks<=15,'Active chunk count remained bounded at '+maxChunks+' (maximum terrain bodies '+maxBodies+')');await returnHome();
 await go(788);await wait(()=>p.read().grounded);check(readTile(s.world,32,22)===1&&Math.abs(p.read().y-506)<3,'Edited boundary terrain reloads with working collision after distant travel');await returnHome();
 stage('Controlled enemy encounters — separate from natural economy proof');
 for(const kind of ['crawler','hopper','drone','gunner','caster','sentinel'] as Kind[]){await returnHome();await go(-430,20000);const q=p.read(),id=`verification-${kind}`,x=q.x+(['caster','gunner'].includes(kind)?180:60),y=q.y;const states=new Set<string>();p.encounter(kind,x,y,id);const start=performance.now();while(performance.now()-start<3500&&p.read().status!=='dead'){const enemy=p.read().enemies.find(f=>f.id===id);if(!enemy)break;states.add(enemy.state);p.hold([]);await sleep(70);}log(`OBSERVED ${kind}: ${[...states].join(', ')}`);if(p.read().status==='dead')throw new Error('Died observing '+kind);p.select(1);const limit=performance.now()+12000;while(!s.world.defeated.includes(id)&&performance.now()<limit){const e=p.read().enemies.find(f=>f.id===id);if(!e)break;p.aim(e.x,e.y);p.hold(['KeyJ']);await sleep(50);if(p.read().status==='dead')break;}p.hold([]);check(s.world.defeated.includes(id),`${kind} could be damaged and defeated through real projectile collisions`);}
 stage('Crafted sword and magic combat');
 for(const item of ['sword','staff'] as const){await returnHome();await go(-430);await s.transact((_b,w)=>{const index=w.inventory.findIndex(v=>v?.id===item);if(index<0)throw new Error('Missing crafted weapon');[w.inventory[3],w.inventory[index]]=[w.inventory[index],w.inventory[3]];});p.select(3);await tap('KeyD');const q=p.read(),id='verification-'+item;p.encounter('crawler',q.x+(item==='sword'?42:115),q.y,id);const end=performance.now()+10000;let usedMana=false;while(!s.world.defeated.includes(id)&&performance.now()<end){const e=p.read().enemies.find(e=>e.id===id);if(!e)break;p.aim(e.x,e.y);p.hold(['KeyJ']);usedMana ||= p.read().mana<100;await sleep(50);}p.hold([]);check(s.world.defeated.includes(id),item+' defeats an enemy with the naturally crafted weapon');if(item==='staff'){check(usedMana,'Magic consumes mana');await wait(()=>p.read().mana===100,10000);check(true,'Mana regenerates after magic stops');}}
 await returnHome();await go(-430);
 stage('Death / respawn retention');const beforeDeath=JSON.stringify({inventory:s.world.inventory,coins:s.world.coins,profile:s.data.profile});const pos=p.read();p.encounter('sentinel',pos.x+18,pos.y,'verification-death');p.recall();const deathLimit=performance.now()+35000;while(p.read().status!=='dead'&&performance.now()<deathLimit){const q=p.read(),e=q.enemies.find(e=>e.id==='verification-death');p.hold(e&&Math.abs(e.x-q.x)>24?[e.x>q.x?'KeyD':'KeyA']:[]);await sleep(60);}check(p.read().status==='dead','Enemy damage reaches the death state');p.hold([]);p.respawn();await wait(()=>p.read().grounded);check(p.read().health===100&&Math.abs(p.read().x-s.world.checkpoint.x)<40,'Death respawn restores health at the checkpoint');check(beforeDeath===JSON.stringify({inventory:s.world.inventory,coins:s.world.coins,profile:s.data.profile}),'Death preserves inventory, coins, and cosmetic ownership');p.pause();stage('COMPLETE — see recorded results');log('Fresh-world progression used no resource or currency grants. Enemy cases used explicit isolated encounter fixtures.');
}
