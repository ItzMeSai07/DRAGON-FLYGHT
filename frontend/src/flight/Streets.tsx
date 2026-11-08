import {useLayoutEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as T from 'three';
import type {Scenario} from '../types';
import {random} from './District';

export function Streets({compact,scenario,phase,paused}:{compact:boolean;scenario:Scenario;phase:number;paused:boolean}){
 const boxes=useRef<T.InstancedMesh>(null!), trees=useRef<T.InstancedMesh>(null!), debris=useRef<T.InstancedMesh>(null!);
 const dummy=useMemo(()=>new T.Object3D(),[]),time=useRef(0);
 const layout=useMemo(()=>{
   const rand=random(907),streets:{x:number;y:number;z:number;w:number;h:number;d:number;color:string}[]=[], foliage:T.Vector3[]=[];
   const box=(x:number,y:number,z:number,w:number,h:number,d:number,color:string)=>streets.push({x,y,z,w,h,d,color});
   for(const z of (compact?[-29,0,27]:[-155,-108,-60,-12,36,84,132])){
     box(0,.04,z,compact?108:370,.08,12,'#454b49');
     for(const s of [-1,1])box(0,.12,z+s*6.8,compact?108:370,.24,1.5,'#b1a792');
     for(let i=compact?-46:-175;i<(compact?51:182);i+=13)box(i,.11,z,5,.04,.22,'#dcc58e');
   }
   for(const x of (compact?[-42,42]:[-152,-22,108]))box(x,.16,0,11,.08,compact?86:335,'#4b504f');
   for(let i=0;i<110;i++){
     const x=(rand()-.5)*365,z=(rand()-.5)*355;
     if(scenario.assets.some(a=>Math.abs(x-a.worldX)<a.width*.65&&Math.abs(z-a.worldZ)<a.width*.58))continue;
     const y=5+rand()*5;box(x,y/2,z,.65,y,.65,'#695a47');foliage.push(new T.Vector3(x,y,z));
   }
   // Outlying city blocks frame the playable neighborhood.
   for(let i=0;i<95;i++){const a=i*2.4,r=306+rand()*90,h=10+rand()*38;box(r*Math.cos(a),h/2,r*Math.sin(a),9+rand()*10,h,10+rand()*12,'#92928a');}
   return {streets,foliage};
 },[scenario.assets,compact]);
 useLayoutEffect(()=>{
   layout.streets.forEach((b,i)=>{dummy.rotation.set(0,0,0);dummy.position.set(b.x,b.y,b.z);dummy.scale.set(b.w,b.h,b.d);dummy.updateMatrix();boxes.current.setMatrixAt(i,dummy.matrix);boxes.current.setColorAt(i,new T.Color(b.color));});
   boxes.current.instanceMatrix.needsUpdate=true;
   layout.foliage.forEach((_,i)=>trees.current.setColorAt(i,new T.Color(i%3?'#536744':'#70774b')));
 },[layout,dummy]);
 useFrame((_,dt)=>{
   if(!paused||phase===0)time.current+=Math.min(dt,.05);
   const wind=phase===2?1:phase===1?.45:.07,t=time.current;
   layout.foliage.forEach((pos,i)=>{dummy.position.copy(pos);dummy.position.x+=wind*Math.sin(t*2+i);dummy.rotation.set(0,i,wind*(.2+.14*Math.sin(t*3+i)));dummy.scale.set(3.1,3.8+i%3,3);dummy.updateMatrix();trees.current.setMatrixAt(i,dummy.matrix);});
   trees.current.instanceMatrix.needsUpdate=true;
   debris.current.visible=phase===1||phase===2;
   if(!debris.current.visible)return;
   debris.current.count=Math.round((phase===2?130:28)*scenario.severity);
   for(let i=0;i<debris.current.count;i++){
     const y=(i*.618%1)*43,a=i*2.4+t*(1.8-y*.024),r=8+y*.55;
     dummy.position.set(-30+Math.cos(a)*r,y+2+Math.sin(a*3),-19+Math.sin(a)*r);
     dummy.rotation.set(a*2,i+a,a);dummy.scale.set(.45+i%4,.13,.7+i%2);dummy.updateMatrix();debris.current.setMatrixAt(i,dummy.matrix);
   }
   debris.current.instanceMatrix.needsUpdate=true;
 });
 return <><instancedMesh ref={boxes} args={[undefined,undefined,layout.streets.length]} frustumCulled={false} receiveShadow><boxGeometry/><meshStandardMaterial/></instancedMesh>
 <instancedMesh ref={trees} args={[undefined,undefined,layout.foliage.length]} frustumCulled={false} castShadow><icosahedronGeometry args={[1,1]}/><meshStandardMaterial flatShading/></instancedMesh>
 <instancedMesh ref={debris} args={[undefined,undefined,130]} frustumCulled={false}><boxGeometry/><meshStandardMaterial color="#8e806e"/></instancedMesh></>;
}
