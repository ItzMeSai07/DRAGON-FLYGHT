import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as T from 'three';
import type {Asset,Scenario} from '../types';
import {arrival} from './District';

export function neighborhood(s:Scenario,flood:boolean):Scenario{
 const houses=s.assets.filter(a=>a.buildingType==='house');
 const focus=houses.find(a=>a.directDamage)??houses[0];
 const nearby=[focus,...houses.filter(a=>a!==focus).sort((a,b)=>Math.hypot(a.worldX-focus.worldX,a.worldZ-focus.worldZ)-Math.hypot(b.worldX-focus.worldX,b.worldZ-focus.worldZ))].slice(0,6);
 const assets=nearby.map((a,i)=>{
   const position={worldX:(i%3-1)*23,worldZ:Math.floor(i/3)*26-14};
   if(!flood)return {...a,...position};
   const wet=i===0,repair=wet?Math.round(a.replacementCost*.08*s.severity):0;
   return {...a,...position,failed:wet,directDamage:wet,repairExpense:repair,totalModeledLoss:repair,revenueAtRisk:0,extraRecoveryExpense:0,status:wet?'Flooded':'Dry',reasons:wet?['Illustrative ground-floor inundation']:[],downtimeDays:wet?3:0};
 });
 return {...s,assets,edges:[]};
}
function Loss({a,phase,clock,flood}:{a:Asset;phase:number;clock:{current:number};flood:boolean}){
 const sprite=useRef<T.Sprite>(null!);
 const texture=useMemo(()=>{
   const canvas=document.createElement('canvas');canvas.width=640;canvas.height=100;
   const ctx=canvas.getContext('2d')!;ctx.fillStyle='#10212bf2';ctx.fillRect(0,0,640,100);ctx.fillStyle=flood?'#8ddfff':'#ffc198';ctx.fillRect(0,0,7,100);ctx.font='bold 27px system-ui';ctx.fillText((flood?'Flood':'Tornado')+' · '+a.name,20,37,600);ctx.fillStyle='white';ctx.font='30px system-ui';ctx.fillText('$'+Math.round(a.repairExpense).toLocaleString()+' estimated repairs',20,79);
   const t=new T.CanvasTexture(canvas);t.colorSpace=T.SRGBColorSpace;return t;
 },[a,flood]);useEffect(()=>()=>texture.dispose(),[texture]);
 useFrame(()=>{const age=clock.current-arrival(a);sprite.current.visible=phase===2&&age>=0&&age<5;sprite.current.position.set(a.worldX,a.height+4+age*.25,a.worldZ);sprite.current.material.opacity=Math.min(1,Math.max(0,5-age));});
 return <sprite ref={sprite} scale={[20,3.1,1]} renderOrder={10}><spriteMaterial map={texture} transparent depthTest={false} depthWrite={false}/></sprite>;
}
export function Losses({scenario,...props}:{scenario:Scenario;phase:number;clock:{current:number};flood:boolean}){
 return <>{scenario.assets.filter(a=>a.directDamage).map(a=><Loss key={a.id} a={a} {...props}/>)}</>;
}
export function Flood({a,phase,clock}:{a:Asset;phase:number;clock:{current:number}}){
 const water=useRef<T.Mesh>(null!),material=useRef<T.ShaderMaterial>(null!);
 const stains=useRef<T.Mesh>(null!), drift=useRef<T.Group>(null!),rain=useRef<T.LineSegments>(null!);
 const rainLines=useMemo(()=>{
   const points=new Float32Array(360*6);
   for(let i=0;i<360;i++){
     const x=(i*.6180339%1-.5)*60,y=(i*.4231%1)*35,z=(i*.75487%1-.5)*60;
     points.set([x,y,z,x+.14,y-.9,z+.1],i*6);
   }
   return points;
 },[]);
 const uniforms=useMemo(()=>({t:{value:0}}),[]);
 useFrame(()=>{const age=phase>=3?12:phase===2?clock.current:0;
 const depth=T.MathUtils.smoothstep(age,0,9);water.current.visible=depth>0;
 stains.current.visible=depth>0;
 stains.current.scale.y=Math.max(.01,depth*2.55);stains.current.position.y=depth*1.275;
 rain.current.visible=phase===1||phase===2;rain.current.position.y=-(clock.current*17%8);
 drift.current.visible=depth>.2;drift.current.position.set(a.worldX+Math.sin(age*.45)*3,depth*2.3+.34,a.worldZ+a.width*.53);drift.current.rotation.set(.09*Math.sin(age*3),age*.19,.07*Math.cos(age*2));
 water.current.position.y=.22+depth*2.3;water.current.scale.setScalar(.5+depth*.65);material.current.uniforms.t.value=age;});
 return <><group position={[a.worldX,0,a.worldZ]}><mesh ref={stains}><boxGeometry args={[a.width+.42,1,a.width*.8+.44]}/><meshStandardMaterial color="#4b4939" transparent opacity={.71}/></mesh>
 <lineSegments ref={rain}><bufferGeometry><bufferAttribute attach="attributes-position" args={[rainLines,3]}/></bufferGeometry><lineBasicMaterial color="#c7e6f4" transparent opacity={.55}/></lineSegments></group>
 <group ref={drift}>{[0,1,2].map(i=><mesh key={i} position={[i*1.9,0,i*.62]} rotation={[0,i*.75,0]}><boxGeometry args={[1.8,.12,.46]}/><meshStandardMaterial color="#796a4e"/></mesh>)}</group>
 <mesh ref={water} position={[a.worldX,0,a.worldZ]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[a.width*.94,80]}/><shaderMaterial ref={material} uniforms={uniforms} transparent depthWrite={false} vertexShader={`varying vec2 p;uniform float t;void main(){p=position.xy;vec3 v=position;v.z+=.13*sin(p.x*1.3+t*3.)+.09*cos(p.y*2.-t*2.);gl_Position=projectionMatrix*modelViewMatrix*vec4(v,1.);}`} fragmentShader={`varying vec2 p;uniform float t;void main(){float wave=sin(p.x*2.+sin(p.y+t)*2.-t*3.)*.5+.5;float ring=pow(.5+.5*cos(length(p)*4.-t*4.),12.);vec3 c=mix(vec3(.055,.18,.19),vec3(.26,.43,.41),wave);gl_FragColor=vec4(c+ring*.19,.84);}`}/></mesh></>;
}
