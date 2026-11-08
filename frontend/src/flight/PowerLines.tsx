import {useEffect,useMemo} from 'react';
import {useFrame} from '@react-three/fiber';
import * as T from 'three';
import type {Scenario} from '../types';
import {arrival} from './District';

export function PowerLines({scenario,phase,clock}:{scenario:Scenario;phase:number;clock:{current:number}}){
 const cables=useMemo(()=>{
   const assets=new Map(scenario.assets.map(a=>[a.id,a]));
   return scenario.edges.filter(e=>e.relationshipType==='POWERED_BY').flatMap(e=>{
     const a=assets.get(e.sourceId),b=assets.get(e.targetId);
     if(!a||!b||Math.hypot(a.worldX-b.worldX,a.worldZ-b.worldZ)>130)return [];
     return [{a,b}];
   });
 },[scenario]);
 const geometry=useMemo(()=>{
   const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(new Float32Array(cables.length*8*6),3));return g;
 },[cables]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 useFrame(()=>{
   const pos=geometry.getAttribute('position');let i=0;
   for(const {a,b} of cables){
     const age=phase>=3?10:phase===2?clock.current-arrival(b):-1;
     const drop=b.directDamage?T.MathUtils.smoothstep(age,0,1.4):0;
     for(let j=0;j<8;j++)for(const end of [0,1]){
       const u=(j+end)/8,hinge=1-Math.abs(u*2-1),gap=j<4?-1:1;
       const y=T.MathUtils.lerp(a.height+1,b.height+1,u);
       pos.setXYZ(i++,T.MathUtils.lerp(a.worldX,b.worldX,u)+gap*drop*hinge,Math.max(.4,y-(2+drop*y)*hinge),T.MathUtils.lerp(a.worldZ,b.worldZ,u));
     }
   }
   pos.needsUpdate=true;
 });
 return <lineSegments geometry={geometry} frustumCulled={false}><lineBasicMaterial color="#504d43" transparent opacity={.63}/></lineSegments>;
}
