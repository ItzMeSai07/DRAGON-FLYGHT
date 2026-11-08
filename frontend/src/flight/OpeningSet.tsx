import {useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {Html,Line} from '@react-three/drei';
import * as T from 'three';
import {CitySkyline} from './CitySkyline';
import {WillowCreek} from './WillowCreek';
import {random} from './District';
import {type OpeningClock} from './openingDirector';

function Box({at,size,color}:{at:[number,number,number];size:[number,number,number];color:string}){
 return <mesh position={at} castShadow receiveShadow><boxGeometry args={size}/><meshStandardMaterial color={color}/></mesh>;
}
export function OpeningSet({clock,seed,cover,stage}:{clock:OpeningClock;seed:number;cover:boolean;stage:number}){
 const debris=useRef<T.InstancedMesh>(null!);
 const hail=useRef<T.InstancedMesh>(null!),chips=useRef<T.InstancedMesh>(null!),crack=useRef<T.Group>(null!),crew=useRef<T.Group>(null!);
 const dummy=useMemo(()=>new T.Object3D(),[]);
 const field=useMemo(()=>{const r=random(seed);return Array.from({length:1400},()=>[r()*640-320,r()*640-320,r(),.055+r()*.13]);},[seed]);
 useFrame((_,delta)=>{
   const t=clock.current;debris.current.visible=t>=90&&t<165;
   for(let i=0;i<240;i++){const a=i*2.399+t*(.4+(i%5)*.06),radius=18+(i%47)*2.6;dummy.position.set(-40+Math.cos(a)*radius,4+(i%43)*1.8+Math.sin(t+i)*3,-38+Math.sin(a)*radius);dummy.rotation.set(t+i,t*.7+i,t*1.2);dummy.scale.set(.3+(i%4)*.4,.08+(i%3)*.1,.5+(i%5)*.3);dummy.updateMatrix();debris.current.setMatrixAt(i,dummy.matrix)}debris.current.instanceMatrix.needsUpdate=true;dummy.rotation.set(0,0,0);
   hail.current.visible=chips.current.visible=t>=40&&t<165;
   crack.current.visible=t>=42;crew.current.position.x=T.MathUtils.damp(crew.current.position.x,cover?4:0,2,delta);
   if(!hail.current.visible)return;
   field.forEach(([x,z,offset,r],i)=>{
     const cycle=(t*.95+offset)%1,y=130*(1-cycle*cycle), drift=cycle*7;
     dummy.position.set(x+drift,y+r,z-cycle*1.3);dummy.scale.set(r,r*(1+cycle),r);dummy.updateMatrix();hail.current.setMatrixAt(i,dummy.matrix);
     const bounce=(t*1.3+offset)%1;
     dummy.position.set(x+7+bounce*1.8,Math.sin(bounce*Math.PI)*.55,z-1.3);dummy.scale.setScalar(r*(1-bounce));dummy.updateMatrix();chips.current.setMatrixAt(i,dummy.matrix);
   });hail.current.instanceMatrix.needsUpdate=chips.current.instanceMatrix.needsUpdate=true;
 });
 return <><CitySkyline/><WillowCreek/>
 <instancedMesh ref={debris} args={[undefined,undefined,240]} frustumCulled={false}><boxGeometry/><meshStandardMaterial color="#796b58" roughness={.9}/></instancedMesh>
 <instancedMesh ref={hail} args={[undefined,undefined,field.length]} frustumCulled={false}><icosahedronGeometry args={[1,0]}/><meshStandardMaterial color="#e0f5ff" roughness={.18}/></instancedMesh>
 <instancedMesh ref={chips} args={[undefined,undefined,field.length]} frustumCulled={false}><icosahedronGeometry args={[1,0]}/><meshBasicMaterial color="#dce9f1"/></instancedMesh>
 <Box at={[8,8,18.8]} size={[6,.36,2.6]} color="#727667"/><Box at={[8,10,18.6]} size={[6,4,.15]} color="#57737a"/>
 <group ref={crack} position={[8,10,18.74]}>{Array.from({length:12},(_,i)=>{const a=i*.524;return <Line key={i} points={[[0,0,0],[Math.cos(a)*.38,Math.sin(a)*.49,0],[Math.cos(a+.16)*1.45,Math.sin(a+.16)*1.3,0]]} color="#c4dce2" lineWidth={1}/>})}</group>
 <Box at={[8,5,22]} size={[11,.35,6]} color="#bb8642"/>
 {[3,13].map(x=><Box key={x} at={[x,2.4,24]} size={[.22,4.8,.22]} color="#555d58"/>)}
 <group position={[-14,0,17]}><Box at={[0,1.55,0]} size={[3,2.2,6]} color="#d9cfab"/><Box at={[0,2.5,1.85]} size={[2.8,1.15,1.9]} color="#436270"/><Box at={[0,3.2,0]} size={[1.7,.25,.46]} color="#ff9640"/>
 {[-1,1].flatMap(x=>[-1.9,1.9].map(z=><mesh key={x+','+z} position={[x*1.49,.78,z]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.68,.68,.32,16]}/><meshStandardMaterial color="#25292a"/></mesh>))}</group>
 <group ref={crew}>{[0,1].map(i=><group key={i} position={[i*1.2,0,23]}><Box at={[0,.55,0]} size={[.48,1,.38]} color="#344452"/><Box at={[0,1.35,0]} size={[.65,.7,.44]} color="#efb044"/><mesh position={[0,1.94,0]}><sphereGeometry args={[.25,12,8]}/><meshStandardMaterial color="#aa8368"/></mesh></group>)}</group>
 {(stage===3||stage===5)&&<Html position={stage===3?[8,7,24]:[17,12,-12]} center><span className="dispatch-pin">{stage===3?'Loading bay':'Shop roof'} · X scan</span></Html>}
 </>;
}
