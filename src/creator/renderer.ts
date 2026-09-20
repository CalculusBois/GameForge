import Phaser from 'phaser';
import { CreationRuntime, componentPose, type Point } from './runtime';
import type { CreationSpec, Shape } from './spec';
const rgb=(s:string)=>parseInt(s.slice(1),16);
function draw(g:Phaser.GameObjects.Graphics,s:Shape,x:number,y:number,angle:number){
 const polygon=(points:number[][],color:string)=>{const c=Math.cos(angle),sin=Math.sin(angle);const transformed=points.map(([px,py])=>new Phaser.Geom.Point(x+px*s.width/2*c-py*s.height/2*sin,y+px*s.width/2*sin+py*s.height/2*c));g.fillStyle(rgb(color),1);g.fillPoints(transformed,true);g.lineStyle(1,0xe5faff,.65);g.strokePoints(transformed,true);};
 if(s.kind==='sword'){
  polygon([[0,-1],[.28,-.72],[.22,.35],[-.22,.35],[-.28,-.72]],s.color);
  polygon([[0,-.9],[.1,-.68],[.08,.31],[0,.31]],'#ffffff');
  polygon([[-.85,.32],[-1,.48],[-.25,.43],[.25,.43],[1,.48],[.85,.32]],s.accent);
  polygon([[-.12,.43],[.12,.43],[.14,.84],[-.14,.84]],'#78514a');
  polygon([[0,.78],[.26,.89],[0,1],[-.26,.89]],s.accent);
 }else if(s.kind==='polygon')polygon(s.points,s.color);
 else if(s.kind==='rect')polygon([[-1,-1],[1,-1],[1,1],[-1,1]],s.color);
 else polygon(Array.from({length:24},(_,i)=>[Math.cos(i*Math.PI/12),Math.sin(i*Math.PI/12)]),s.color);
 for(const layer of s.layers??[])polygon(layer.points,layer.color);
}
export class CreatorRenderer {
 readonly runtime:CreationRuntime;
 private sprites=new Map<string,Phaser.Physics.Arcade.Sprite>();
 private labels=new Map<string,Phaser.GameObjects.Text>();
 private graphics:Phaser.GameObjects.Graphics;
 private textures=new Map<string,string>();
 private serial=0;
 private scene:Phaser.Scene;
 constructor(scene:Phaser.Scene,foes:Phaser.Physics.Arcade.Group,player:()=>Point,safe:(p:Point,r:number)=>boolean,damage:(n:number,x:number,source:string)=>boolean){
  this.scene=scene;
  this.graphics=scene.add.graphics().setDepth(15);
  this.runtime=new CreationRuntime({player,safe,damage,spawn:(spec,p)=>{
   let sprite:Phaser.Physics.Arcade.Sprite|undefined,label:Phaser.GameObjects.Text|undefined;const key=`ai-${spec.id}-${++this.serial}`;
   try{
    if(spec.entityType!=='mechanic'){
     const body=spec.visuals.find(c=>c.radius===0)??spec.visuals[0];const w=Math.max(8,body.shape.width),h=Math.max(8,body.shape.height);
     const g=scene.make.graphics({x:0,y:0});try {g.fillStyle(0xffffff,0);g.fillRect(0,0,w,h);g.generateTexture(key,w,h);}finally{g.destroy();}
     sprite=foes.create(p.x,p.y,key) as Phaser.Physics.Arcade.Sprite;
     sprite.setData({creator:spec.id,kind:'drone',id:`ai:${spec.id}`,team:'enemy',hp:spec.stats.health,maxHp:spec.stats.health});
     (sprite.body as Phaser.Physics.Arcade.Body).setAllowGravity(false).setImmovable(true);
     label=scene.add.text(p.x,p.y-85,spec.name,{fontSize:'12px',color:'#efffff',backgroundColor:'#112032',padding:{x:5,y:3}}).setOrigin(.5).setDepth(16);
    }
   }catch(e){sprite?.destroy();label?.destroy();if(scene.textures.exists(key))scene.textures.remove(key);throw e;}
   this.removeResources(spec.id);
   if(sprite){this.sprites.set(spec.id,sprite);this.textures.set(spec.id,key);}if(label)this.labels.set(spec.id,label);
  },remove:id=>this.removeResources(id),move:(id,p)=>{const sprite=this.sprites.get(id);sprite?.setPosition(p.x,p.y).setVelocity(0);if(sprite?.body)(sprite.body as Phaser.Physics.Arcade.Body).reset(p.x,p.y);}});
 }
 private removeResources(id:string){this.sprites.get(id)?.destroy();this.sprites.delete(id);this.labels.get(id)?.destroy();this.labels.delete(id);const key=this.textures.get(id);if(key)this.scene.textures.remove(key);this.textures.delete(id);}
 apply(spec:CreationSpec){const result=this.runtime.apply(spec);this.draw();return result;}
 draw(){const g=this.graphics;g.clear();for(const a of this.runtime.actors.values()){
  if(a.defeated||a.spec.entityType==='mechanic')continue;
  a.spec.visuals.forEach((c,i)=>{for(let n=0;n<c.count;n++){const p=componentPose(a,i,n,this.runtime.time);draw(g,c.shape,p.x,p.y,p.angle);}});
  this.labels.get(a.spec.id)?.setPosition(a.x,a.y-95).setText(`${a.spec.name} · ${Math.ceil(a.hp)}/${a.spec.stats.health} · ${a.state}`);
  g.fillStyle(0x162333);g.fillRect(a.x-65,a.y-73,130,7);g.fillStyle(0xef7788);g.fillRect(a.x-65,a.y-73,130*a.hp/a.spec.stats.health,7);
  if(a.pending.length){g.lineStyle(3,0xffc16c,.85);g.strokeCircle(a.x,a.y,50+Math.sin(this.runtime.time/75)*5);}
  if(this.runtime.time<a.born+a.spec.spawn.grace){g.lineStyle(2,0x8affde,.7);g.strokeCircle(a.x,a.y,90);}
 }
 for(const s of this.runtime.shots)draw(g,s.p.shape,s.x,s.y,s.angle+Math.PI/2);
 }
 read(){const r=this.runtime;return {actors:r.actors.size,defeated:[...r.actors.values()].filter(a=>a.defeated).length,health:[...r.actors.values()].find(a=>!a.defeated&&a.spec.entityType!=='mechanic')?.hp??0,shots:r.shots.length,swordShots:r.shots.filter(s=>s.p.shape.kind==='sword').length,meters:r.meters.length,meterValue:r.meters[0]?.value??0,activeEffects:r.meters.filter(m=>m.until>r.time).length,textures:this.textures.size,objects:this.scene.children.length,time:r.time};}
 destroy(){this.runtime.reset();this.graphics.destroy();}
}
