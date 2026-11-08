import * as T from 'three';

export const beats = [
 [0,20,'Willow Creek','Maya Chen','Van Two, radio check. Meet us by Patel’s loading bay before the weather turns.'],
 [20,40,'Patel’s windowsill','Mr. Patel','Little scout is back. I’ll leave the light on for you.'],
 [40,60,'First warning','Elena Torres','That sound on the glass is hail. Maya, pull your crew under cover.'],
 [60,90,'Scout the covered loading bay','Maya Chen','Find the amber awning and press X nearby. We can move the crew and supplies under it.'],
 [90,110,'Beyond the rooftops','Elena Torres','Look west of the shops. That dust is climbing into the cloud.'],
 [110,140,'Survey the shop','Maya Chen','Take the street past the shop. Scan its roof with X so we know what we’re dealing with.'],
 [140,165,'Roof failure','Mr. Patel','The corner is lifting. There goes the whole front edge!'],
 [165,180,'Rendezvous at Van Two','Maya Chen','Bring it in, Dragonfly. We need eyes on the pharmacy circuit next.']
] as const;
export function beatIndex(t:number){return beats.findIndex(b=>t<b[1])<0?7:beats.findIndex(b=>t<b[1]);}
export const manual=(i:number)=>i===3||i===5;
export type OpeningClock={current:number};
const smooth=(n:number)=>T.MathUtils.smoothstep(n,0,1);
const eye=new T.Vector3(), aim=new T.Vector3(), target=new T.Vector3();
type Rig={pos:T.Vector3;velocity:T.Vector3;heading:number;yaw:number;pitch:number;bank:number};
export function directOpening(t:number,dt:number,camera:T.PerspectiveCamera,actor:T.Group,rig:Rig){
 const i=beatIndex(t);if(manual(i))return false;
 const u=smooth((t-beats[i][0])/(beats[i][1]-beats[i][0]));
 if(i<=2){
   const launch=i===2?smooth((u-.2)/.8):0;
   rig.pos.set(8-launch*2,8.45+launch*6+Math.sin(launch*Math.PI)*2,19.85+launch*12);
   if(i===0){eye.set(250-229*u,140-122*u,210-176*u);aim.set(8*u,5+3*u,17*u);}
   else if(i===1){eye.set(12-3*u,9.8-.8*u,24-u);aim.copy(rig.pos);}
   else{eye.set(9+launch*1.5,9+launch*8.5,23+launch*16);aim.copy(rig.pos);}
 }else if(i===4){
   eye.copy(rig.pos);eye.x+=5+11*u;eye.y+=3+9*u;eye.z+=9+14*u;
   aim.copy(rig.pos).lerp(target.set(-40,30,-38),smooth(u*2));
 }else if(i===6){
   eye.set(35-15*u+Math.sin(u*Math.PI)*13,12+5*u,12-11*u);aim.set(17-4*u,8-3*u,-12);
 }else{
   target.set(-14,4.2,17);rig.pos.lerp(target,1-Math.exp(-dt*.6));
   eye.set(-7-u*8,7-u*2,28-u*4);aim.copy(rig.pos);
 }
 const blend=1-Math.exp(-dt*(i===0?1.8:2.8));
 camera.position.lerp(eye,blend);
 const rotation=camera.quaternion.clone();camera.lookAt(aim);camera.quaternion.slerp(rotation,1-blend);
 camera.fov=T.MathUtils.damp(camera.fov,i===1?38:i===4?67:53,2,dt);camera.updateProjectionMatrix();
 rig.velocity.set(0,0,0);rig.heading=rig.yaw=.35;rig.pitch=-.08;rig.bank=0;
 actor.position.copy(rig.pos);actor.rotation.set(0,rig.heading,0);
 return true;
}
