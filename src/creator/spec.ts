/** The complete executable vocabulary. No source code, URLs, expressions or asset fetches. */
export interface Shape { kind: 'sword' | 'polygon' | 'ellipse' | 'rect'; color: string; accent: string; width: number; height: number; points: number[][]; layers?: {points:number[][];color:string}[] }
export interface Component { id: string; shape: Shape; count: number; radius: number; orbitSpeed: number; spin: number; x: number; y: number; damage: number; cooldown: number }
export interface Projectile { shape: Shape; speed: number; turnRate: number; lifetime: number; damage: number; count: number; spread: number; burst: number; burstInterval: number; orbitRadius: number; orbitSpeed: number; status: string | null }
export type Action = { type: 'fire'; attack: string } | { type: 'state'; state: string } | { type: 'move'; mode: 'hover' | 'pursuit' | 'charge' | 'stationary'; speed: number } | { type: 'orbit'; speed: number };
export interface Rule { event: 'timer' | 'healthBelow' | 'enter'; state: string; interval: number; threshold: number; once: boolean; actions: Action[] }
export interface StatusSpec { id: string; label: string; color: string; icon: string; sources: string[]; amount: number; maximum: number; decayDelay: number; decayRate: number; duration: number; damage: number; damageInterval: number; resetOnActivation: boolean; refresh: 'refresh' | 'ignore'; stacking: 'none'; death: 'clear'; respawn: 'clear' }
export interface WorldCreation { spec: CreationSpec; x: number; y: number; defeated: boolean }
export interface CreationSpec {
 version: 1; id: string; name: string; entityType: 'boss' | 'enemy' | 'mechanic'; lifetime: 'world'; summary: string;
 requirements: { text: string; supported: boolean; evidence: string[]; limitation: string }[];
 visuals: Component[];
 movement: { mode: 'hover' | 'pursuit' | 'charge' | 'stationary'; speed: number; distance: number };
 stats: { health: number; contactDamage: number; contactCooldown: number };
 attacks: { id: string; windup: number; projectile: Projectile }[];
 graph: { initial: string; states: string[]; rules: Rule[] };
 statuses: StatusSpec[];
 spawn: { distance: number; grace: number }; removal: 'defeat-or-manual';
}
function object(v: unknown, keys: string[], path: string, optional:string[]=[]): Record<string, unknown> {
 if (!v || typeof v !== 'object' || Array.isArray(v)) throw Error(`${path}: expected object`);
 const o = v as Record<string, unknown>;
 for (const k of Object.keys(o)) if (!keys.includes(k)) throw Error(`${path}.${k}: unsupported capability`);
 for (const k of keys) if (!(k in o)&&!optional.includes(k)) throw Error(`${path}.${k}: required`);
 return o;
}
function num(v: unknown, min: number, max: number, path: string): number { if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) throw Error(`${path}: expected ${min}–${max}`); return v; }
function str(v: unknown, path: string, max=240): string { if (typeof v !== 'string' || !v.trim() || v.length > max) throw Error(`${path}: expected text (1–${max})`); return v; }
function choice(v: unknown, opts: readonly unknown[], path: string) { if (!opts.includes(v)) throw Error(`${path}: supported values: ${opts.join(', ')}`); }
function list(v: unknown, max: number, path: string): unknown[] { if (!Array.isArray(v) || v.length > max) throw Error(`${path}: expected list, maximum ${max}`); return v; }
function bool(v: unknown, p: string) { choice(v,[true,false],p); }
function id(v: unknown, p: string) { if (!/^[a-z][a-z0-9-]{0,47}$/.test(str(v,p,48))) throw Error(`${p}: use lowercase-kebab-case`); }
function color(v: unknown) { if (!/^#[0-9a-f]{6}$/i.test(str(v,'color',7))) throw Error('Colors must be #RRGGBB'); }
function shape(v: unknown) {
 const s=object(v,['kind','color','accent','width','height','points','layers'],'shape',['layers']);
 choice(s.kind,['sword','polygon','ellipse','rect'],'shape.kind'); color(s.color);color(s.accent);
 num(s.width,4,160,'shape.width');num(s.height,4,160,'shape.height');
 if(s.layers!==undefined)list(s.layers,8,'shape.layers').forEach(v=>{const l=object(v,['points','color'],'layer');color(l.color);const points=list(l.points,24,'layer.points');if(points.length<3)throw Error('Layer requires 3 points');points.forEach(p=>{const a=list(p,2,'point');if(a.length!==2)throw Error('Point requires x,y');a.forEach(n=>num(n,-1,1,'point'));});});
 const points=list(s.points,24,'shape.points'); if(s.kind==='polygon' && points.length<3) throw Error('Polygon requires at least 3 points');
 points.forEach(p=>{const a=list(p,2,'point');if(a.length!==2)throw Error('Point requires x,y');a.forEach(n=>num(n,-1,1,'point coordinate'));});
}
function unique(values: unknown[], p: string) { if(new Set(values).size!==values.length) throw Error(`${p}: duplicate IDs`); }
export function validateSpec(value: unknown): CreationSpec {
 if(JSON.stringify(value)?.length>90000) throw Error('Creation exceeds 90 KB');
 const o=object(value,['version','id','name','entityType','lifetime','summary','requirements','visuals','movement','stats','attacks','graph','statuses','spawn','removal'],'creation');
 choice(o.version,[1],'version');id(o.id,'id');str(o.name,'name',80);str(o.summary,'summary',1000);
 choice(o.entityType,['boss','enemy','mechanic'],'entityType');choice(o.lifetime,['session','world'],'lifetime');choice(o.removal,['defeat-or-manual'],'removal');
 const requirements=list(o.requirements,32,'requirements');if(!requirements.length)throw Error('Explicit requirement coverage is required');
 requirements.forEach(v=>{const r=object(v,['text','supported','evidence','limitation'],'requirement');str(r.text,'requirement',500);bool(r.supported,'supported');list(r.evidence,16,'evidence').forEach(x=>str(x,'evidence'));if(typeof r.limitation!=='string')throw Error('limitation must be text');if(!r.supported)throw Error(`Unmet requirement: ${r.text}. ${r.limitation}`);if(!(r.evidence as unknown[]).length)throw Error('Requirement needs executable evidence');});
 const visuals=list(o.visuals,16,'visuals');let total=0;
 visuals.forEach(v=>{const c=object(v,['id','shape','count','radius','orbitSpeed','spin','x','y','damage','cooldown'],'component');id(c.id,'component.id');shape(c.shape);total+=num(c.count,1,12,'count');if(!Number.isInteger(c.count))throw Error('count must be integer');num(c.radius,0,150,'radius');num(c.orbitSpeed,-8,8,'orbitSpeed');num(c.spin,-12,12,'spin');num(c.x,-150,150,'x');num(c.y,-150,150,'y');num(c.damage,0,80,'damage');num(c.cooldown,500,10000,'cooldown');});
 if(total>32)throw Error('Maximum 32 visual instances');if(o.entityType!=='mechanic'&&!visuals.length)throw Error('Entity requires original visual components');
 unique(visuals.map(v=>(v as Component).id),'visuals');
 const m=object(o.movement,['mode','speed','distance'],'movement');choice(m.mode,['hover','pursuit','charge','stationary'],'movement.mode');num(m.speed,0,300,'speed');num(m.distance,60,400,'distance');
 const stats=object(o.stats,['health','contactDamage','contactCooldown'],'stats');num(stats.health,10,5000,'health');num(stats.contactDamage,0,100,'contactDamage');num(stats.contactCooldown,500,10000,'contactCooldown');
 const attacks=list(o.attacks,8,'attacks');unique(attacks.map(a=>(a as {id:string}).id),'attacks');
 attacks.forEach(v=>{const a=object(v,['id','windup','projectile'],'attack');id(a.id,'attack.id');num(a.windup,400,5000,'windup');const p=object(a.projectile,['shape','speed','turnRate','lifetime','damage','count','spread','burst','burstInterval','orbitRadius','orbitSpeed','status'],'projectile');shape(p.shape);for(const [k,min,max] of [['speed',40,400],['turnRate',0,2.5],['lifetime',300,8000],['damage',0,100],['count',1,12],['spread',0,6.28],['burst',1,6],['burstInterval',100,3000],['orbitRadius',0,160],['orbitSpeed',-8,8]] as const)num(p[k],min,max,k);if(!Number.isInteger(p.count)||!Number.isInteger(p.burst))throw Error('Projectile counts must be integers');if(p.status!==null)id(p.status,'projectile.status');});
 const statuses=list(o.statuses,8,'statuses');unique(statuses.map(s=>(s as StatusSpec).id),'statuses');
 statuses.forEach(v=>{const s=object(v,['id','label','color','icon','sources','amount','maximum','decayDelay','decayRate','duration','damage','damageInterval','resetOnActivation','refresh','stacking','death','respawn'],'status');id(s.id,'status.id');str(s.label,'label',60);str(s.icon,'icon',8);color(s.color);const sources=list(s.sources,16,'sources');if(!sources.length)throw Error('Status needs attack sources');sources.forEach(x=>{if(x!=='enemy-contact'&&x!=='enemy-projectile'&&x!=='generated-contact'&&!attacks.some(a=>(a as {id:string}).id===x))throw Error(`Unknown status source: ${x}`);});for(const [k,min,max] of [['amount',1,100],['maximum',1,1000],['decayDelay',0,30000],['decayRate',0.1,100],['duration',500,30000],['damage',1,50],['damageInterval',500,10000]] as const)num(s[k],min,max,k);bool(s.resetOnActivation,'resetOnActivation');choice(s.refresh,['refresh','ignore'],'refresh');choice(s.stacking,['none'],'stacking');choice(s.death,['clear'],'death');choice(s.respawn,['clear'],'respawn');});
 attacks.forEach(v=>{const s=(v as {projectile:Projectile}).projectile.status;if(s!==null&&!statuses.some(x=>(x as StatusSpec).id===s))throw Error(`Unknown status: ${s}`);});
 const graph=object(o.graph,['initial','states','rules'],'graph');const states=list(graph.states,8,'states');states.forEach(s=>id(s,'state'));unique(states,'states');choice(graph.initial,states,'initial');
 list(graph.rules,32,'rules').forEach(v=>{const r=object(v,['event','state','interval','threshold','once','actions'],'rule');choice(r.event,['timer','healthBelow','enter'],'event');choice(r.state,states,'rule.state');num(r.interval,500,30000,'interval');num(r.threshold,0,1,'threshold');bool(r.once,'once');list(r.actions,8,'actions').forEach(v=>{if(!v||typeof v!=='object')throw Error('Invalid action');const type=(v as Action).type;
 if(type==='fire'){const a=object(v,['type','attack'],'action');choice(a.attack,attacks.map(x=>(x as {id:string}).id),'attack reference');}
 else if(type==='state'){const a=object(v,['type','state'],'action');choice(a.state,states,'state reference');}
 else if(type==='move'){const a=object(v,['type','mode','speed'],'action');choice(a.mode,['hover','pursuit','charge','stationary'],'mode');num(a.speed,0,300,'speed');}
 else if(type==='orbit'){const a=object(v,['type','speed'],'action');num(a.speed,-8,8,'orbit speed');}else throw Error(`Unsupported action: ${type}`);
 });});
 const spawn=object(o.spawn,['distance','grace'],'spawn');num(spawn.distance,260,600,'spawn.distance');num(spawn.grace,1500,10000,'spawn.grace');
 // Every claimed requirement must resolve to an actual nonempty executable field.
 requirements.forEach(v=>{for(const path of (v as CreationSpec['requirements'][number]).evidence){if(!/^(visuals|movement|stats|attacks|graph|statuses|spawn|lifetime|removal)(\.[a-zA-Z0-9]+)*$/.test(path))throw Error(`Invalid evidence path: ${path}`);let current:unknown=o;for(const part of path.split('.')){if(!current||typeof current!=='object')throw Error(`Missing evidence: ${path}`);current=(current as Record<string,unknown>)[part];}if(current===undefined||current===null||(Array.isArray(current)&&!current.length))throw Error(`Empty evidence: ${path}`);}});
 const spec=structuredClone(value) as CreationSpec;
 spec.lifetime='world';
 return spec;
}
