import { validateSpec, type CreationSpec, type Projectile, type StatusSpec, type Shape } from './spec';
export interface Point { x:number; y:number }
export interface Actor extends Point { spec:CreationSpec; hp:number; state:string; entered:number; mode:CreationSpec['movement']['mode']; speed:number; chargeAngle:number; orbitOverride?:number; born:number; due:Map<number,number>; fired:Set<number>; contact:Map<string,number>; pending:{attack:string;due:number;remaining:number}[]; defeated:boolean }
export interface Shot extends Point { owner:string; attack:string; p:Projectile; angle:number; born:number; origin:Point; phase:number }
export interface Meter { owner:string; spec:StatusSpec; value:number; lastHit:number; until:number; nextDamage:number }
export interface Host { player:()=>Point; damage:(amount:number,x:number,source:string)=>boolean; safe:(p:Point,radius:number)=>boolean; spawn:(spec:CreationSpec,p:Point)=>void; remove:(id:string)=>void; move:(id:string,p:Point)=>void }
export function turnToward(angle:number,target:number,max:number) { const delta=Math.atan2(Math.sin(target-angle),Math.cos(target-angle));return angle+Math.max(-max,Math.min(max,delta)); }
/** Oriented local shape test with player radius; sword hitbox follows its long blade. */
export function touches(point:Point,center:Point,shape:Shape,angle:number,padding=12) {
 const dx=point.x-center.x,dy=point.y-center.y,c=Math.cos(angle),s=Math.sin(angle);
 const x=dx*c+dy*s,y=-dx*s+dy*c;
 if(shape.kind==='ellipse')return (x/(shape.width/2+padding))**2+(y/(shape.height/2+padding))**2<=1;
 return Math.abs(x)<=shape.width/2+padding&&Math.abs(y)<=shape.height/2+padding;
}
export function componentPose(a:Actor,index:number,copy:number,time:number) {
 const c=a.spec.visuals[index],t=(time-a.born)/1000,phase=copy*Math.PI*2/c.count+t*(a.orbitOverride??c.orbitSpeed);
 return {x:a.x+c.x+Math.cos(phase)*c.radius,y:a.y+c.y+Math.sin(phase)*c.radius,angle:phase*(c.radius?1:0)+c.spin*t};
}
export class CreationRuntime {
 actors=new Map<string,Actor>(); shots:Shot[]=[];meters:Meter[]=[];time=0;
 private host:Host;
 constructor(host:Host){this.host=host;}
 apply(value:unknown) {
  const spec=validateSpec(value);
  if(!this.actors.has(spec.id)&&this.actors.size>=8)throw Error('Session limit: 8 creations. Remove one first.');
  const player=this.host.player();let position:Point|undefined;
  const extent=Math.max(30,...spec.visuals.map(c=>Math.hypot(c.x,c.y)+c.radius+Math.max(c.shape.width,c.shape.height)/2));
  if(spec.entityType==='mechanic')position={...player};
  else for(const dx of [spec.spawn.distance,-spec.spawn.distance,spec.spawn.distance+120,-spec.spawn.distance-120]){
   for(const dy of [-100,-200,-300,0]){const p={x:player.x+dx,y:player.y+dy};if(Math.hypot(dx,dy)>extent+100&&this.host.safe(p,extent)){position=p;break;}}if(position)break;
  }
  if(!position)throw Error('No safe encounter space nearby. Move to an open area and retry; previous creation retained.');
  // Host prepares rendering/physics before replacing existing ownership. It must be atomic.
  this.host.spawn(spec,position);
  this.shots=this.shots.filter(s=>s.owner!==spec.id);this.meters=this.meters.filter(s=>s.owner!==spec.id);
  const actor:Actor={...position,spec,hp:spec.stats.health,state:spec.graph.initial,entered:this.time,mode:spec.movement.mode,speed:spec.movement.speed,chargeAngle:Math.atan2(player.y-position.y,player.x-position.x),born:this.time,due:new Map(),fired:new Set(),contact:new Map(),pending:[],defeated:false};
  this.actors.set(spec.id,actor);
  for(const status of spec.statuses)this.meters.push({owner:spec.id,spec:status,value:0,lastHit:-Infinity,until:0,nextDamage:0});
  return spec;
 }
 remove(id:string){this.host.remove(id);this.actors.delete(id);this.shots=this.shots.filter(s=>s.owner!==id);this.meters=this.meters.filter(s=>s.owner!==id);}
 reset(){for(const id of [...this.actors.keys()])this.remove(id);this.shots=[];this.meters=[];}
 hit(id:string,damage:number){const a=this.actors.get(id);if(!a||a.defeated)return;a.hp=Math.max(0,a.hp-damage);if(a.hp===0){a.defeated=true;a.pending=[];this.host.remove(id);this.shots=this.shots.filter(s=>s.owner!==id);this.meters=this.meters.filter(s=>s.owner!==id);}}
 death(){for(const m of this.meters){m.value=0;m.until=0;}this.shots=[];}
 buildup(source:string,owner?:string,status?:string|null){for(const m of this.meters){if(owner&&m.owner!==owner)continue;if(!m.spec.sources.includes(source)&&m.spec.id!==status)continue;
  if(m.until>this.time&&m.spec.refresh==='ignore')continue;
  m.lastHit=this.time;m.value=Math.min(m.spec.maximum,m.value+m.spec.amount);
  if(m.value>=m.spec.maximum){m.until=this.time+m.spec.duration;m.nextDamage=this.time+m.spec.damageInterval;if(m.spec.resetOnActivation)m.value=0;}
 }}
 contact(id:string,source='generated-contact'){const a=this.actors.get(id);if(!a||a.defeated||this.time<a.born+a.spec.spawn.grace)return;this.touch(a,'body',a.spec.stats.contactDamage,a.spec.stats.contactCooldown,a.x,source);}
 private touch(a:Actor,key:string,damage:number,cooldown:number,x:number,source:string){if(!damage||this.time<(a.contact.get(key)??0))return;a.contact.set(key,this.time+cooldown);if(this.host.damage(damage,x,source))this.buildup(source);}
 tick(ms:number){const dt=Math.min(50,Math.max(0,ms));this.time+=dt;const player=this.host.player();
  for(const a of this.actors.values()){
   if(a.defeated)continue;
   if(a.spec.entityType!=='mechanic'){
    let tx=player.x,ty=player.y-60;
    if(a.mode==='hover'){tx+=Math.cos(this.time/1600)*a.spec.movement.distance;ty=player.y-110+Math.sin(this.time/900)*30;}
    const angle=a.mode==='charge'?a.chargeAngle:Math.atan2(ty-a.y,tx-a.x),distance=Math.hypot(tx-a.x,ty-a.y),step=a.mode==='stationary'?0:(a.mode==='charge'?a.speed*dt/1000:Math.min(distance,a.speed*dt/1000));
    const next={x:a.x+Math.cos(angle)*step,y:a.y+Math.sin(angle)*step};
    if(this.host.safe(next,Math.max(16,...a.spec.visuals.filter(c=>!c.radius).map(c=>Math.max(c.shape.width,c.shape.height)/2)))){a.x=next.x;a.y=next.y;}
    this.host.move(a.spec.id,a);
   }
   if(this.time<a.born+a.spec.spawn.grace)continue;
   const state=a.state;let actions=0;
   for(const [index,r] of a.spec.graph.rules.entries()){
    if(r.state!==state||(r.once&&a.fired.has(index)))continue;
    const due=a.due.get(index)??a.entered+(r.event==='timer'?r.interval:0);
    if(this.time<due||(r.event==='healthBelow'&&a.hp/a.spec.stats.health>r.threshold)||(r.event==='enter'&&a.fired.has(index)))continue;
    a.due.set(index,this.time+r.interval);a.fired.add(index);
    for(const action of r.actions){if(++actions>32)break;
     if(action.type==='fire'){const attack=a.spec.attacks.find(x=>x.id===action.attack)!;if(a.pending.length<8&&!a.pending.some(p=>p.attack===attack.id))a.pending.push({attack:attack.id,due:this.time+attack.windup,remaining:attack.projectile.burst});}
     if(action.type==='state'&&a.state!==action.state){a.state=action.state;a.entered=this.time;a.due.clear();for(const [i,rule] of a.spec.graph.rules.entries())if(!rule.once)a.fired.delete(i);}
     if(action.type==='move'){a.mode=action.mode;a.speed=action.speed;if(action.mode==='charge')a.chargeAngle=Math.atan2(player.y-a.y,player.x-a.x);}
     if(action.type==='orbit')a.orbitOverride=action.speed;
    }
    if(a.state!==state)break;
   }
   for(const p of a.pending){if(this.time<p.due)continue;const attack=a.spec.attacks.find(x=>x.id===p.attack)!;const def=attack.projectile;
    for(let i=0;i<def.count&&this.shots.length<96;i++){const angle=Math.atan2(player.y-a.y,player.x-a.x)+(i-(def.count-1)/2)*(def.count>1?def.spread/(def.count-1):0);this.shots.push({x:a.x,y:a.y,origin:{x:a.x,y:a.y},owner:a.spec.id,attack:attack.id,p:def,angle,born:this.time,phase:i*Math.PI*2/def.count});}
    p.remaining--;p.due=this.time+def.burstInterval;
   }a.pending=a.pending.filter(p=>p.remaining>0);
   a.spec.visuals.forEach((c,i)=>{if(!c.damage)return;for(let n=0;n<c.count;n++){const p=componentPose(a,i,n,this.time);if(touches(player,p,c.shape,p.angle))this.touch(a,c.id,c.damage,c.cooldown,p.x,'generated-contact');}});
  }
  this.shots=this.shots.filter(s=>{
   if(this.time-s.born>s.p.lifetime)return false;
   s.angle=turnToward(s.angle,Math.atan2(player.y-s.y,player.x-s.x),s.p.turnRate*dt/1000);
   const prev={x:s.x,y:s.y};
   if(s.p.orbitRadius){const a=this.actors.get(s.owner);if(!a||a.defeated)return false;const phase=s.phase+(this.time-s.born)/1000*s.p.orbitSpeed;s.x=a.x+Math.cos(phase)*s.p.orbitRadius;s.y=a.y+Math.sin(phase)*s.p.orbitRadius;s.angle=Math.atan2(s.y-prev.y,s.x-prev.x);}
   else {s.x+=Math.cos(s.angle)*s.p.speed*dt/1000;s.y+=Math.sin(s.angle)*s.p.speed*dt/1000;}
   // Substeps avoid tunnelling at low framerates.
   const steps=Math.max(1,Math.ceil(Math.hypot(s.x-prev.x,s.y-prev.y)/6));
   for(let i=1;i<=steps;i++){const p={x:prev.x+(s.x-prev.x)*i/steps,y:prev.y+(s.y-prev.y)*i/steps};if(!this.host.safe(p,3))return false;if(touches(player,p,s.p.shape,s.angle+Math.PI/2)){if(this.host.damage(s.p.damage,s.x,s.attack))this.buildup(s.attack,s.owner,s.p.status);return false;}}
   return true;
  });
  for(const m of this.meters){if(this.time-m.lastHit>m.spec.decayDelay)m.value=Math.max(0,m.value-m.spec.decayRate*dt/1000);if(m.until>this.time&&this.time>=m.nextDamage){this.host.damage(m.spec.damage,player.x,'status');m.nextDamage=this.time+m.spec.damageInterval;}if(m.until<=this.time)m.until=0;}
 }
}
