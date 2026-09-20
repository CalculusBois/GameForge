import { describe,it,expect,vi } from 'vitest';
import { exampleSpec } from './example';
import { validateSpec, type StatusSpec } from './spec';
import { CreationRuntime,componentPose,turnToward,touches, type Host } from './runtime';
const fresh=()=>structuredClone(exampleSpec);
const status:StatusSpec={id:'rot',label:'Scarlet rot',color:'#ce3545',icon:'☣',sources:['enemy-contact'],amount:30,maximum:100,decayDelay:2000,decayRate:10,duration:5000,damage:3,damageInterval:1000,resetOnActivation:true,refresh:'ignore',stacking:'none',death:'clear',respawn:'clear'};
function setup(){const host:Host={player:()=>({x:0,y:0}),safe:()=>true,spawn:vi.fn(),remove:vi.fn(),move:vi.fn(),damage:vi.fn(()=>true)};return {host,r:new CreationRuntime(host)};}
function tick(r:CreationRuntime,ms:number){for(let i=0;i<ms;i+=50)r.tick(Math.min(50,ms-i));}
describe('bounded session creator',()=>{
 it('validates a novel polygon design and rejects code, nonfinite stats, dangling references and unsupported requirements',()=>{
  expect(validateSpec(fresh()).visuals[0].shape.kind).toBe('polygon');
  expect(()=>validateSpec({...fresh(),script:'fetch("https://bad")'})).toThrow('unsupported');
  let s=fresh();s.stats.health=Infinity;expect(()=>validateSpec(s)).toThrow();
  s=fresh();s.graph.rules[0].actions=[{type:'fire',attack:'missing'}];expect(()=>validateSpec(s)).toThrow('reference');
  s=fresh();s.requirements[0].supported=false;s.requirements[0].limitation='Inventory weapons unavailable';expect(()=>validateSpec(s)).toThrow('Inventory weapons');
  s=fresh();s.requirements[0].evidence=['attacks.9'];expect(()=>validateSpec(s)).toThrow('Empty evidence');
 });
 it('spawns at a supplied world position and accepts world lifetime',()=>{
  const {r}=setup(),s=fresh();r.apply(s,{x:420,y:180});expect(r.actors.get(s.id)?.x).toBe(420);expect(validateSpec(s).lifetime).toBe('world');
 });
 it('constructs a six-sword boss by composition without prompt matching',()=>{
  const {r}=setup(),s=fresh();s.visuals[0].shape.kind='sword';s.visuals[1].shape.kind='sword';s.visuals[1].count=6;s.attacks[0].projectile.shape.kind='sword';r.apply(s);const a=r.actors.get(s.id)!;const first=componentPose(a,1,0,r.time);tick(r,3000);const second=componentPose(a,1,0,r.time);expect(first).not.toEqual(second);expect(Math.hypot(second.x-a.x,second.y-a.y)).toBeCloseTo(70);expect(a.pending.length).toBe(1);expect(r.shots).toHaveLength(0);tick(r,900);expect(r.shots.length).toBeGreaterThan(0);expect(r.shots[0].p.shape.kind).toBe('sword');
 });
 it('bounds homing and uses an oriented elongated collision shape',()=>{
  expect(turnToward(0,Math.PI,0.1)).toBeCloseTo(.1);expect(turnToward(3.1,-3.1,.02)).toBeCloseTo(3.12);
  const shape={...fresh().visuals[0].shape,kind:'sword' as const,width:10,height:60};
  expect(touches({x:25,y:0},{x:0,y:0},shape,Math.PI/2,0)).toBe(true);expect(touches({x:25,y:0},{x:0,y:0},shape,0,0)).toBe(false);
 });
 it('enforces grace and independent contact cooldowns, transitions phase, expires shots and removes ownership',()=>{
  const {r,host}=setup(),s=fresh();r.apply(s);r.contact(s.id);expect(host.damage).not.toHaveBeenCalled();tick(r,2500);r.contact(s.id);r.contact(s.id);expect(host.damage).toHaveBeenCalledTimes(1);r.hit(s.id,200);tick(r,50);expect(r.actors.get(s.id)?.state).toBe('enraged');tick(r,4000);r.remove(s.id);expect(r.actors.size).toBe(0);expect(r.shots.length).toBe(0);expect(r.meters.length).toBe(0);
 });
 it('preserves current creation when validation, resource allocation or safe placement fails',()=>{
  const {r,host}=setup(),s=fresh();r.apply(s);const a=r.actors.get(s.id);s.stats.health=-2;expect(()=>r.apply(s)).toThrow();expect(r.actors.get(s.id)).toBe(a);host.safe=()=>false;expect(()=>r.apply(fresh())).toThrow('safe');expect(r.actors.get(s.id)).toBe(a);host.safe=()=>true;host.spawn=()=>{throw Error('allocation');};expect(()=>r.apply(fresh())).toThrow('allocation');expect(r.actors.get(s.id)).toBe(a);
 });
 it('supports buildup, delayed decay, threshold DOT, no stacking, death and owner cleanup',()=>{
  const {r,host}=setup(),s=fresh();s.entityType='mechanic';s.visuals=[];s.attacks=[];s.graph.rules=[];s.requirements=[{text:'Rot buildup',supported:true,evidence:['statuses'],limitation:''}];s.statuses=[status];r.apply(s);
  r.buildup('enemy-projectile');expect(r.meters[0].value).toBe(0);r.buildup('enemy-contact');tick(r,2000);expect(r.meters[0].value).toBe(30);tick(r,1000);expect(r.meters[0].value).toBeCloseTo(20);
  for(let i=0;i<3;i++)r.buildup('enemy-contact');expect(r.meters[0].value).toBe(0);const until=r.meters[0].until;r.buildup('enemy-contact');expect(r.meters[0].until).toBe(until);tick(r,1000);expect(host.damage).toHaveBeenCalledWith(3,0,'status');r.death();expect(r.meters[0].until).toBe(0);r.remove(s.id);expect(r.meters).toHaveLength(0);
 });
 it('deflects shots away from the player and into the owner',()=>{
  const {r,host}=setup(),s=fresh();
  host.deflect=vi.fn((p)=>Math.hypot(p.x,p.y)<40);
  r.apply(s);
  const actor=r.actors.get(s.id)!;
  actor.x=180;actor.y=0;actor.mode='stationary';actor.speed=0;actor.born=-1e6;
  r.shots.push({x:180,y:0,origin:{x:180,y:0},owner:s.id,attack:'shard-volley',p:{...s.attacks[0].projectile,speed:400,turnRate:0,lifetime:4000,orbitRadius:0},angle:Math.PI,born:r.time,phase:0});
  tick(r,600);
  expect(host.deflect).toHaveBeenCalled();
  expect(host.damage).not.toHaveBeenCalled();
  expect(r.shots.some(shot=>shot.reflected)).toBe(true);
  tick(r,600);
  expect(actor.hp).toBeLessThan(s.stats.health);
 });
 it('replaces without duplicates, bounds all resources and cleans repeated cycles',()=>{
  const {r}=setup();for(let i=0;i<30;i++){const s=fresh();r.apply(s);s.visuals[1].orbitSpeed=3;r.apply(s);expect(r.actors.size).toBe(1);tick(r,5000);expect(r.shots.length).toBeLessThanOrEqual(96);r.reset();expect(r.actors.size+r.meters.length+r.shots.length).toBe(0);}
 });
});
