import Phaser from 'phaser';
import { ANIMAL_REGISTRY, type WorldSave, TILE, CHUNK } from './model';
import { biome, readTile, solid, surface, hash } from './terrain';

/** Wildlife has its own population, movement and threat response; never uses hostile AI. */
export class Wildlife {
  group: Phaser.Physics.Arcade.Group;
  private lastSpawn = 0;
  private world: () => WorldSave;
  constructor(scene: Phaser.Scene, world: () => WorldSave) {
    this.world = world;
    this.group = scene.physics.add.group();
  }
  update(clock: number, player: Phaser.Physics.Arcade.Sprite) {
    const w = this.world();
    for (const obj of this.group.getChildren()) {
      const a = obj as Phaser.Physics.Arcade.Sprite, d = ANIMAL_REGISTRY[a.getData('species')];
      if (Math.hypot(a.x-player.x,a.y-player.y)>1500) { a.destroy(); continue; }
      if (a.getData('dying') || clock < a.getData('think')) continue;
      a.setData('think',clock+180);
      const body=a.body as Phaser.Physics.Arcade.Body;
      const threatened = clock < (a.getData('threat') ?? 0);
      const neutralAttack = !d.passive && threatened;
      const near = Math.hypot(a.x-player.x,a.y-player.y)<d.detectPlayerRadius;
      let dir = a.getData('dir') as number;
      if (near && (threatened || d.passive)) dir = Math.sign(a.x-player.x) * (neutralAttack ? -1 : 1);
      else if(clock > a.getData('turn')) { dir *= -1; a.setData('turn',clock+2000+hash(w.settings.seed,Math.floor(a.x),0,'wander')*3000); }
      const tx=Math.floor((a.x+dir*20)/TILE), ty=Math.floor(body.bottom/TILE);
      const safe = solid(w,tx,ty+1) && !solid(w,tx,ty-1) && readTile(w,tx,ty)!==23;
      const moving = safe && (near || Math.floor(clock/1800)%3!==0);
      a.setVelocityX(moving ? dir*d.speed*(near ? d.fleeSpeedMultiplier : 1) : 0).setFlipX(dir<0);
      a.setData('dir',safe ? dir : -dir);
      a.setScale(1, moving ? 1 + Math.sin(clock/95)*.05 : 1);
      a.setData('retaliating', neutralAttack);
    }
    if(clock-this.lastSpawn<(w.settings.difficulty==='extreme'?350:1800) || this.group.countActive()>=(w.settings.difficulty==='extreme'?40:8)) return;
    this.lastSpawn=clock;
    const cx=Math.floor(player.x/(CHUNK*TILE));
    const range = w.settings.difficulty==='extreme' ? 4 : 1;
    let spawned = 0;
    const maxWildlife = w.settings.difficulty==='extreme' ? 8 : 1;
    for(let offset=-range;offset<=range;offset++) {
      if (spawned >= maxWildlife) break;
      for (let slot = 0; slot < (w.settings.difficulty==='extreme' ? 3 : 1); slot++) {
        if (spawned >= maxWildlife || this.group.countActive() >= (w.settings.difficulty==='extreme'?40:8)) break;
        const id=`animal:${cx+offset}:${slot}`;
        if(w.defeated.includes(id)||this.group.getChildren().some(a=>(a as Phaser.Physics.Arcade.Sprite).getData('id')===id)) continue;
        const tx=(cx+offset)*CHUNK+4+Math.floor(hash(w.settings.seed,cx+offset,slot,'animal-x')*20);
        let ty=surface(w.settings,tx)-1;
        if(player.y/TILE>ty+15) { ty=Math.floor(player.y/TILE); for(let n=0;n<12&&!solid(w,tx,ty+1);n++) ty++; }
        const roster=Object.values(ANIMAL_REGISTRY).filter(d=>d.preferredBiomes.includes(biome(w.settings,tx,ty)));
        if(!roster.length||solid(w,tx,ty)||readTile(w,tx,ty)===23||!solid(w,tx,ty+1)||Math.abs(tx*TILE-player.x)<(w.settings.difficulty==='extreme'?80:160))continue;
        const d=roster[Math.floor(hash(w.settings.seed,tx,ty,`animal-${slot}`)*roster.length)];
        const a=this.group.create((tx+.5)*TILE,(ty+1)*TILE-d.hitbox.height/2-1,d.texture) as Phaser.Physics.Arcade.Sprite;
        a.setSize(d.collider.width,d.collider.height).setDepth(8);
        a.setData({species:d.id,id,hp:d.hp,dir:1,turn:clock+2000,think:clock});
        spawned++;
      }
    }
  }
}
