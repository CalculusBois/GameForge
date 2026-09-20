import Phaser from 'phaser';
import { CreationRuntime, componentPose, type Point } from './runtime';
import type { CreationSpec, Shape } from './spec';
const rgb=(s:string)=>parseInt(s.slice(1),16);
function mix(hex:string,f:number){
 const n=parseInt(hex.slice(1),16);
 const r=Math.min(255,Math.max(0,Math.round(((n>>16)&255)*f+255*(1-Math.min(1,f))*0.15)));
 const g=Math.min(255,Math.max(0,Math.round(((n>>8)&255)*f+255*(1-Math.min(1,f))*0.12)));
 const b=Math.min(255,Math.max(0,Math.round((n&255)*f+255*(1-Math.min(1,f))*0.08)));
 return (r<<16)|(g<<8)|b;
}
export function draw(g:Phaser.GameObjects.Graphics,s:Shape,x:number,y:number,angle:number){
 const polygon=(points:number[][],color:string,stroke=true)=>{
  const c=Math.cos(angle),sin=Math.sin(angle);
  const transformed=points.map(([px,py])=>new Phaser.Geom.Point(x+px*s.width/2*c-py*s.height/2*sin,y+px*s.width/2*sin+py*s.height/2*c));
  g.fillStyle(rgb(color),1);
  g.fillPoints(transformed,true);
  if(stroke){g.lineStyle(2,mix(s.accent,1.15),.9);g.strokePoints(transformed,true);}
 };
 const scaled=(points:number[][],k:number)=>points.map(([px,py])=>[px*k,py*k]);
 const flame=[[0,-1],[.42,-.55],[.62,-.08],[.38,.55],[0,1],[-.38,.55],[-.62,-.08],[-.42,-.55]];
 if(s.kind==='sword'){
  polygon([[0,-1],[.28,-.72],[.22,.35],[-.22,.35],[-.28,-.72]],s.color);
  polygon([[0,-.9],[.1,-.68],[.08,.31],[0,.31]],'#ffffff');
  polygon([[-.85,.32],[-1,.48],[-.25,.43],[.25,.43],[1,.48],[.85,.32]],s.accent);
  polygon([[-.12,.43],[.12,.43],[.14,.84],[-.14,.84]],'#78514a');
  polygon([[0,.78],[.26,.89],[0,1],[-.26,.89]],s.accent);
 }else if(s.kind==='polygon'){
  polygon(s.points,s.color);
  if(!(s.layers&&s.layers.length)){
   polygon(scaled(s.points,0.62),s.accent,false);
   polygon(scaled(s.points,0.28),'#fff3c8',false);
  }
 }else if(s.kind==='rect'){
  polygon([[-1,-1],[1,-1],[1,1],[-1,1]],s.color);
 }else{
  polygon(flame,s.color);
  polygon(scaled(flame,0.55),s.accent,false);
  polygon([[0,-.72],[.16,-.2],[0,.1],[-.16,-.2]],'#fff4c2',false);
 }
 for(const layer of s.layers??[])polygon(layer.points,layer.color,false);
 if(s.kind==='rect'){
  const c=Math.cos(angle),sin=Math.sin(angle);
  const xf=(px:number,py:number)=>({x:x+px*s.width/2*c-py*s.height/2*sin,y:y+px*s.width/2*sin+py*s.height/2*c});
  g.lineStyle(Math.max(1,Math.min(3,s.height/10)),rgb(s.accent),.95);
  const bed=xf(-1,0),bed2=xf(1,0);g.lineBetween(bed.x,bed.y,bed2.x,bed2.y);
  const a=xf(-0.4,-1),b=xf(-0.4,0);g.lineBetween(a.x,a.y,b.x,b.y);
  const c1=xf(0.4,0),c2=xf(0.4,1);g.lineBetween(c1.x,c1.y,c2.x,c2.y);
 }
}
function paintCreationTexture(scene:Phaser.Scene,spec:CreationSpec,key:string){
 const body=spec.visuals.find(c=>!c.radius)??spec.visuals[0];
 if(!body)return {w:64,h:64};
 const w=Math.min(160,Math.max(72,Math.ceil(body.shape.width)+40));
 const h=Math.min(192,Math.max(88,Math.ceil(body.shape.height)+40));
 const g=scene.make.graphics({x:0,y:0},false);
 try{
  if(scene.textures.exists(key))scene.textures.remove(key);
  const cx=w/2,cy=h/2+2;
  g.fillStyle(0x0d1822,0.45);g.fillEllipse(cx,h-10,w*0.62,12);
  for(const c of spec.visuals.filter(v=>!v.radius))draw(g,c.shape,cx+c.x,cy+c.y,0);
  g.generateTexture(key,w,h);
 }finally{g.destroy();}
 return {w,h};
}
function hitboxFor(spec:CreationSpec,sprite:Phaser.Physics.Arcade.Sprite){
 const pad = spec.entityType==='boss' ? 1.25 : 1.15;
 const bw=Math.round(Math.max(sprite.width, 64) * pad);
 const bh=Math.round(Math.max(sprite.height, 72) * pad);
 return {bw,bh,ox:(sprite.width-bw)/2,oy:(sprite.height-bh)/2};
}
export class CreatorRenderer {
 readonly runtime:CreationRuntime;
 private sprites=new Map<string,Phaser.Physics.Arcade.Sprite>();
 private labels=new Map<string,Phaser.GameObjects.Text>();
 private graphics:Phaser.GameObjects.Graphics;
 private textures=new Map<string,string>();
 private serial=0;
 private scene:Phaser.Scene;
 constructor(scene:Phaser.Scene,foes:Phaser.Physics.Arcade.Group,player:()=>Point,safe:(p:Point,r:number)=>boolean,damage:(n:number,x:number,source:string)=>boolean,deflect?:(p:Point,incomingAngle:number)=>boolean){
  this.scene=scene;
  this.graphics=scene.add.graphics().setDepth(15);
  this.runtime=new CreationRuntime({player,safe,damage,deflect,spawn:(spec,p)=>{
   let sprite:Phaser.Physics.Arcade.Sprite|undefined,label:Phaser.GameObjects.Text|undefined;const key=`ai-${spec.id}-${++this.serial}`;
   try{
    if(spec.entityType!=='mechanic'){
     paintCreationTexture(scene,spec,key);
     sprite=foes.create(p.x,p.y,key) as Phaser.Physics.Arcade.Sprite;
     sprite.setDepth(9);
     sprite.setScale(spec.entityType==='boss'?1.45:1.2);
     sprite.setData({creator:spec.id,kind:'drone',id:`ai:${spec.id}`,team:'enemy',hp:spec.stats.health,maxHp:spec.stats.health});
     const body=sprite.body as Phaser.Physics.Arcade.Body;
     const box=hitboxFor(spec,sprite);
     body.setAllowGravity(false).setImmovable(true);
     body.setSize(box.bw, box.bh);
     body.setOffset(box.ox, box.oy);
     body.checkCollision.none=true;
     label=scene.add.text(p.x,p.y-110,spec.name,{fontSize:'12px',color:'#efffff',backgroundColor:'#112032',padding:{x:5,y:3}}).setOrigin(.5).setDepth(16);
    }
   }catch(e){sprite?.destroy();label?.destroy();if(scene.textures.exists(key))scene.textures.remove(key);throw e;}
   this.removeResources(spec.id);
   if(sprite){this.sprites.set(spec.id,sprite);this.textures.set(spec.id,key);}if(label)this.labels.set(spec.id,label);
  },remove:id=>this.removeResources(id),move:(id,p)=>{const sprite=this.sprites.get(id);sprite?.setPosition(p.x,p.y).setVelocity(0);if(sprite?.body)(sprite.body as Phaser.Physics.Arcade.Body).reset(p.x,p.y);}});
 }
 private removeResources(id:string){this.sprites.get(id)?.destroy();this.sprites.delete(id);this.labels.get(id)?.destroy();this.labels.delete(id);const key=this.textures.get(id);if(key)this.scene.textures.remove(key);this.textures.delete(id);}
 apply(spec:CreationSpec,at?:Point){const result=this.runtime.apply(spec,at);this.draw();return result;}
 draw(){const g=this.graphics;g.clear();for(const a of this.runtime.actors.values()){
  if(a.defeated||a.spec.entityType==='mechanic')continue;
  a.spec.visuals.forEach((c,i)=>{if(!c.radius)return;const shape={...c.shape,width:Math.min(40,Math.max(16,c.shape.width)),height:Math.min(44,Math.max(16,c.shape.height))};for(let n=0;n<c.count;n++){const p=componentPose(a,i,n,this.runtime.time);const dx=p.x-a.x,dy=p.y-a.y,dist=Math.hypot(dx,dy),cap=Math.min(dist||0,88);const ox=dist?a.x+dx/dist*cap:a.x,oy=dist?a.y+dy/dist*cap:a.y;draw(g,shape,ox,oy,p.angle);}});
  const sprite=this.sprites.get(a.spec.id);
  const top=a.y-(sprite?sprite.displayHeight*0.55:70)-28;
  this.labels.get(a.spec.id)?.setPosition(a.x,top).setText(`${a.spec.name} · ${Math.ceil(a.hp)}/${a.spec.stats.health} · ${a.state}`);
  g.fillStyle(0x162333);g.fillRect(a.x-65,top+16,130,7);g.fillStyle(0xef7788);g.fillRect(a.x-65,top+16,130*a.hp/a.spec.stats.health,7);
  if(a.pending.length){g.lineStyle(3,0xffc16c,.85);g.strokeCircle(a.x,a.y,50+Math.sin(this.runtime.time/75)*5);}
  if(this.runtime.time<a.born+a.spec.spawn.grace){g.lineStyle(2,0x8affde,.7);g.strokeCircle(a.x,a.y,90);}
 }
 for(const s of this.runtime.shots)draw(g,{...s.p.shape,width:Math.min(32,s.p.shape.width+8),height:Math.min(40,s.p.shape.height+10)},s.x,s.y,s.angle+Math.PI/2);
 }
 read(){const r=this.runtime;return {actors:r.actors.size,defeated:[...r.actors.values()].filter(a=>a.defeated).length,health:[...r.actors.values()].find(a=>!a.defeated&&a.spec.entityType!=='mechanic')?.hp??0,shots:r.shots.length,swordShots:r.shots.filter(s=>s.p.shape.kind==='sword').length,meters:r.meters.length,meterValue:r.meters[0]?.value??0,activeEffects:r.meters.filter(m=>m.until>r.time).length,textures:this.textures.size,objects:this.scene.children.length,time:r.time};}
 destroy(){this.runtime.reset();this.graphics.destroy();}
}
