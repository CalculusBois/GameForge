import type { CreationSpec, Shape } from './spec';
export const crystal: Shape = {kind:'polygon',color:'#a0dfff',accent:'#ffcb70',width:50,height:70,points:[[0,-1],[.5,0],[0,1],[-.5,0]]};
/** Documentation sample only; runtime never dispatches on a prompt or example name. */
export const exampleSpec: CreationSpec = {
 version:1,id:'prism-guardian',name:'Prism Guardian',entityType:'boss',lifetime:'session',summary:'A hovering crystal with orbiting shards, telegraphed volleys and an enraged pursuit phase.',
 requirements:[{text:'Orbiting crystal guardian with volleys and two phases',supported:true,evidence:['visuals','attacks','graph'],limitation:''}],
 visuals:[{id:'core',shape:crystal,count:1,radius:0,orbitSpeed:0,spin:.2,x:0,y:0,damage:0,cooldown:1000},{id:'shards',shape:{...crystal,width:16,height:30},count:4,radius:70,orbitSpeed:1.5,spin:1,x:0,y:0,damage:8,cooldown:1000}],
 movement:{mode:'hover',speed:65,distance:180},stats:{health:350,contactDamage:10,contactCooldown:1000},
 attacks:[{id:'shard-volley',windup:900,projectile:{shape:{...crystal,width:12,height:26},speed:150,turnRate:.7,lifetime:3500,damage:8,count:3,spread:.5,burst:1,burstInterval:180,orbitRadius:0,orbitSpeed:0,status:null}}],
 graph:{initial:'guard',states:['guard','enraged'],rules:[{event:'timer',state:'guard',interval:3000,threshold:0,once:false,actions:[{type:'fire',attack:'shard-volley'}]},{event:'healthBelow',state:'guard',interval:500,threshold:.5,once:true,actions:[{type:'state',state:'enraged'},{type:'move',mode:'pursuit',speed:95},{type:'orbit',speed:2.5}]},{event:'timer',state:'enraged',interval:2200,threshold:0,once:false,actions:[{type:'fire',attack:'shard-volley'}]}]},
 statuses:[],spawn:{distance:360,grace:2500},removal:'defeat-or-manual',
};
