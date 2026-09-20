import {useEffect,useRef,useState} from 'react';
import {SaveStore} from '../sandbox/persistence';
import {startSandbox,type SandboxController,type VerificationPort} from '../sandbox/engine';
import {exampleSpec} from './example';
import {validateSpec,type CreationSpec} from './spec';
import {editTile} from '../sandbox/terrain';
import {add} from '../sandbox/model';
const sleep=(n:number)=>new Promise(r=>setTimeout(r,n));
/** Dev-only, isolated real IndexedDB + real Phaser integration tests. Never opens the player database. */
export default function CreatorVerification(){
 const host=useRef<HTMLDivElement>(null),game=useRef<SandboxController|null>(null),port=useRef<VerificationPort|null>(null),store=useRef<SaveStore|null>(null);
 const [meters,setMeters]=useState<{id:string;label:string;value:number;maximum:number;remaining:number;color:string;icon:string}[]>([]);
 const [lines,setLines]=useState<string[]>([]),[state,setState]=useState('Opening isolated verification database'),[snapshot,setSnapshot]=useState(''),[ready,setReady]=useState(false);
 const report=(s:string)=>setLines(v=>[...v,s]);
 useEffect(()=>{let alive=true;const db=`gameforge-creator-verification-${Date.now()}`;
 void (async()=>{const s=await SaveStore.open(db);store.current=s;
 const check=(ok:unknown,label:string)=>{if(!ok)throw Error(label);if(alive)report(`PASS: ${label}`);};
 await s.transact((_b,w)=>{w.coins=73;});const base=s.export();await s.beginAISession();
 await Promise.all([s.transact((b,w)=>{w.coins+=100;b.profile.owned.push('ranger');}),s.transact((_b,w)=>{w.progress.stone=9;editTile(w,100,20,0);})]);
 check(s.world.coins===173,'AI transactions compose in memory');check(s.export()===base,'Export excludes all AI progress');
 const durable=await SaveStore.open(db);check(durable.export()===base,'Actual IndexedDB unchanged by AI world and profile writes');
 s.schedulePosition(999,200,1);await s.exitAISession();await sleep(1300);check(s.export()===base,'Exit cancels delayed positions and restores pre-session state');
 await s.transact((_b,w)=>{w.coins+=2;});check((await SaveStore.open(db)).world.coins===75,'Ordinary non-AI gameplay persists after exit');
 // Prepared combat equipment, only in the isolated database.
 await s.transact((_b,w)=>{add(w.inventory,'rifle_rail',1);});
 if(!alive||!host.current)return;
 game.current=startSandbox(host.current,s,h=>{if(alive){setMeters(h.aiMeters??[]);setSnapshot(`${h.status} · HP ${h.health} · ${h.bodies} terrain bodies · ${h.enemies} enemies · ${h.fps} FPS`);}},()=>{},p=>{port.current=p;if(alive){setReady(true);setState('Persistence checks passed. Ready for prepared runtime regression.');}});
 })().catch(e=>{if(alive)setState(`FAILED: ${String(e)}`);});return()=>{alive=false;game.current?.destroy();};},[]);
 const run=async()=>{setReady(false);setState('Running prepared Phaser runtime regression');const s=store.current!,p=port.current!,g=game.current!;
 const check=(ok:unknown,label:string)=>{if(!ok)throw Error(label);report(`PASS: ${label}`);};
 const wait=async(fn:()=>boolean,ms=10000)=>{const end=performance.now()+ms;while(!fn()){if(performance.now()>end)throw Error('Timed out waiting for runtime condition');await sleep(50);}};
 try{
  p.resume();await sleep(1200);p.pause();await g.save();await s.beginAISession();const base=s.export();
  const spec=structuredClone(exampleSpec);spec.id='verification-blade';spec.name='Prepared Sixblade';spec.stats.health=180;spec.visuals[0].shape.kind='sword';spec.visuals[0].shape.width=42;spec.visuals[0].shape.height=110;spec.visuals[1].shape.kind='sword';spec.visuals[1].count=6;spec.visuals[1].shape.height=45;spec.attacks[0].projectile.shape.kind='sword';
  g.applyCreation(validateSpec(spec));const initial=p.creatorRead!();check(initial.actors===1&&initial.textures===1,'One prepared sword actor owns one collider texture');
  for(let i=0;i<12;i++){g.removeCreation(spec.id);g.applyCreation(spec);}check(p.creatorRead!().textures===initial.textures&&p.creatorRead!().objects===initial.objects,'12 real create/remove cycles do not grow textures or display objects');
  let failed=false;try{g.applyCreation({...spec,stats:{...spec.stats,health:-1}});}catch{failed=true;}check(failed&&p.creatorRead!().actors===1,'Rejected replacement preserves live actor');
  p.resume();await wait(()=>p.creatorRead!().shots>0,16000);p.pause();check(p.creatorRead!().swordShots>0,'Real Phaser scene renders sword projectiles after windup');
  const before=p.creatorRead!().time;await sleep(250);check(p.creatorRead!().time===before,'Paused session freezes graph timers and effects');
  const edit=structuredClone(spec);edit.visuals[1].orbitSpeed=3;g.applyCreation(edit);check(p.creatorRead!().actors===1,'Follow-up replaces one actor without duplicates');
  p.select(s.world.inventory.findIndex(x=>x?.id==='rifle_rail'));p.resume();
  const end=performance.now()+30000;let damaged=false;
  while(performance.now()<end){const target=p.read().enemies.find(e=>e.id===`ai:${spec.id}`);if(!target)break;p.aim(target.x,target.y);p.hold(['KeyJ']);if(p.creatorRead!().health<180)damaged=true;await sleep(60);}
  p.hold([]);p.pause();check(damaged,'Ordinary player projectiles damage the generated boss');check(p.creatorRead!().defeated===1&&p.creatorRead!().textures===0,'Boss defeated through actual combat; collider, texture and projectiles removed');
  const rot:CreationSpec={...structuredClone(exampleSpec),id:'verification-rot',name:'Prepared rot meter',entityType:'mechanic',visuals:[],attacks:[],graph:{initial:'active',states:['active'],rules:[]},requirements:[{text:'Rot meter',supported:true,evidence:['statuses'],limitation:''}],statuses:[{id:'rot',label:'Scarlet rot',color:'#df4455',icon:'☣',sources:['enemy-contact'],amount:40,maximum:100,decayDelay:1500,decayRate:12,duration:5000,damage:3,damageInterval:1000,resetOnActivation:true,refresh:'ignore',stacking:'none',death:'clear',respawn:'clear'}]};
  g.applyCreation(rot);p.creatorBuildup!('enemy-contact');check(p.creatorRead!().meterValue===40,'Accepted attack source updates reusable meter');p.creatorBuildup!('enemy-contact');p.creatorBuildup!('enemy-contact');check(p.creatorRead!().activeEffects===1,'Threshold activates one nonstacking timed effect');
  const hp=p.read().health;p.resume();await wait(()=>p.read().health<hp,5000);p.pause();check(p.read().health<hp,'Timed effect applies actual player damage on its interval');p.respawn();p.pause();check(p.creatorRead!().activeEffects===0&&p.creatorRead!().meterValue===0,'Respawn clears temporary status state');
  g.removeCreation(rot.id);check(p.creatorRead!().meters===0,'Removing mechanic removes HUD/effect ownership');g.resetCreations();check(p.creatorRead!().actors===0&&p.creatorRead!().textures===0&&p.creatorRead!().shots===0,'Reset clears all owned runtime resources');
  check(s.export()===base,'Prepared AI encounter leaves persistent save unchanged');
  setState('PASS — persistence, prepared combat, lifecycle and cleanup regression');setReady(true);
 }catch(e){p.hold([]);p.pause();setState(`FAILED: ${String(e)}`);setReady(true);}
 };
 return <main style={{padding:20}}><h1>Session creator verification</h1><p>Dev-only prepared fixtures; separate timestamped database. These tests do not claim live model generation or natural combat balance.</p><strong role="status">{state}</strong><p>{snapshot}</p>{meters.map(m=><div key={m.id} style={{color:m.color}}>{m.icon} {m.label} · {Math.ceil(m.remaining/1000)}s <meter min={0} max={m.maximum} value={m.value}/></div>)}<button disabled={!ready} onClick={()=>void run()}>Run prepared runtime regression</button><div ref={host} style={{width:960,maxWidth:'100%',aspectRatio:'16/9'}}/><pre style={{whiteSpace:'pre-wrap'}}>{lines.join('\n')}</pre></main>;
}
