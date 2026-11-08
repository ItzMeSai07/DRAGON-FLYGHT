import {useEffect,useMemo,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import * as T from 'three';
import type {Scenario} from '../types';
import {arrival,random} from './District';

// One GPU draw for funnel billows, cloud ceiling, ground skirt, and local plumes.
const vertex = `
attribute vec4 seed; attribute float kind;
uniform float time, intensity, impact, aftermath, pixels, severity;
varying float opacity, tone, hash, spark;
void main(){
 vec3 p=position;
 float h=seed.x, a=seed.y*6.28318, size=1.;
 spark=0.;tone=seed.w;hash=seed.z*30.;
 vec2 center=mix(vec2(-93.,-100.),vec2(-25.,-17.),smoothstep(0.,8.,impact));
 if(kind<1.5){
   float skirt=step(.5,kind);
   float y=mix(135.*h,11.*h,skirt);
   float radius=mix(3.+48.*pow(h,1.55),6.+31.*seed.z,skirt)*(0.82+.24*seed.z);
   a+=time*(1.8-.96*h)+y*.042;
   p=vec3(center.x+sin(h*4.+time*.42)*h*12.+cos(a)*radius,y,center.y+sin(a)*radius);
   size=mix(7.+h*24.,13.,skirt); opacity=intensity*.64*(.6+.4*severity);
 }else if(kind<2.5){
   p.x+=sin(time*.12+a)*11.;size=62.+42.*h;opacity=.22+.35*intensity;
 }else if(kind>3.5){
   float age=impact-seed.y;
   float flight=mod(max(age,0.)+seed.x*.5,.7);
   p+=vec3(cos(hash)*flight*7.,flight*4.-13.*flight*flight,sin(hash)*flight*7.);
   spark=1.;size=.27;opacity=step(0.,age)*(1.-smoothstep(.35,1.3,age));
 }else{
   float age=impact-seed.y, run=mod(max(age,0.)+h*3.,4.);
   p+=vec3(run*(3.+seed.z*3.)+sin(a)*h*5.,run*(2.+h*2.),cos(hash)*run);
   size=3.+run*3.;opacity=step(0.,age)*sin(run*.7854)*(.6-.37*aftermath);
 }
 vec4 mv=modelViewMatrix*vec4(p,1.);
 gl_Position=projectionMatrix*mv;
 gl_PointSize=clamp(size*pixels/max(3.,-mv.z),1.,320.);
}`;
const fragment=`
varying float opacity,tone,hash,spark;
float rnd(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(rnd(i),rnd(i+vec2(1,0)),f.x),mix(rnd(i+vec2(0,1)),rnd(i+1.),f.x),f.y);}
void main(){
 vec2 q=gl_PointCoord-.5;float n=noise(q*7.+hash)*.7+noise(q*15.+hash)*.3;
 float alpha=(1.-smoothstep(.16,.5,length(q)+.13*(n-.5)))*opacity;
 if(alpha<.012)discard;
 vec3 c=mix(vec3(.16,.19,.21),vec3(.79,.72,.59),clamp(.2+tone*.43+n*.5-q.y*.35,0.,1.));
 gl_FragColor=vec4(mix(c,vec3(1.,.75,.31),spark),alpha);
 #include <colorspace_fragment>
}`;
export function Weather({scenario,phase,paused,quality,clock,motion}:{scenario:Scenario;phase:number;paused:boolean;quality:string;clock:{current:number};motion:boolean}){
 const {scene,gl}=useThree(),light=useRef<T.DirectionalLight>(null!), elapsed=useRef(0);
 const material=useRef<T.ShaderMaterial>(null!);
 const initialUniforms=useMemo(()=>Object.fromEntries(['time','intensity','impact','aftermath','pixels','severity'].map(k=>[k,{value:0}])),[]);
 const geometry=useMemo(()=>{
   const count=quality==='Low'?240:quality==='High'?900:540,rand=random(scenario.randomSeed), pos:number[]=[],seed:number[]=[],kind:number[]=[];
   function add(k:number,x:number,y:number,z:number,start=rand()){kind.push(k);pos.push(x,y,z);seed.push(rand(),start,rand(),rand());}
   for(let i=0;i<68;i++)add(2,(rand()-.5)*660,110+rand()*60,(rand()-.5)*660);
   for(let i=0;i<count;i++)add(i%5===0?1:0,0,0,0);
   scenario.assets.filter(a=>a.directDamage&&a.buildingType!=='road').forEach(a=>{for(let i=0;i<12;i++)add(3,a.worldX+rand()*6,1,a.worldZ+rand()*6,arrival(a));});
   scenario.assets.filter(a=>a.failed&&(a.buildingType==='substation'||a.buildingType==='telecom')).forEach(a=>{for(let i=0;i<28;i++)add(4,a.worldX,a.height+1,a.worldZ,arrival(a));});
   const g=new T.BufferGeometry();
   g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('seed',new T.Float32BufferAttribute(seed,4));g.setAttribute('kind',new T.Float32BufferAttribute(kind,1));return g;
 },[quality,scenario]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 const palette=useMemo(()=>[new T.Color('#cad1c6'),new T.Color('#556069'),new T.Color('#997e65')],[]);
 const target=useMemo(()=>new T.Color(),[]);
 useFrame((_,delta)=>{
   const dt=Math.min(delta,.06);if(!paused||phase===0)elapsed.current+=dt;
   const t=clock.current, uniforms=material.current.uniforms;
   uniforms.time.value=elapsed.current;uniforms.impact.value=phase>=3?32+elapsed.current%20:phase===2?t:-10;
   uniforms.aftermath.value=Number(phase>=3);uniforms.severity.value=scenario.severity;
   const level=phase===2?1:phase===1?.45:0;
   uniforms.intensity.value=T.MathUtils.damp(uniforms.intensity.value,level,1.1,dt);
   uniforms.pixels.value=gl.domElement.height*.8;
   const sky=scene.background as T.Color,fog=scene.fog as T.Fog;
   target.copy(phase>=3?palette[2]:palette[0]).lerp(palette[1],uniforms.intensity.value);
   sky.lerp(target,1-Math.exp(-dt*2));fog.color.copy(sky);fog.far=560-280*uniforms.intensity.value;
   const flash=phase===2&&motion?Math.pow(Math.max(0,Math.cos((t-4)*.89)),120):0;
   light.current.intensity=2.5-uniforms.intensity.value*1.45+flash*2;
 });
 return <><directionalLight ref={light} position={[-80,125,-50]} color="#fff1d5" castShadow shadow-mapSize={[1024,1024]} shadow-camera-far={460} shadow-camera-left={-180} shadow-camera-right={180} shadow-camera-top={180} shadow-camera-bottom={-180}/>
 <points geometry={geometry} frustumCulled={false}><shaderMaterial ref={material} uniforms={initialUniforms} vertexShader={vertex} fragmentShader={fragment} transparent depthWrite={false}/></points></>;
}
