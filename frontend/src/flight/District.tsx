import {useLayoutEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as T from 'three';
import type {Asset,Scenario} from '../types';

export function random(seed:number) {
  return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
}
export function arrival(a:Asset){return 1+(a.worldZ+180)*.011+(a.worldX+180)*.006;}
function structure(s:Scenario){
  type Piece={a:Asset,x:number,y:number,z:number,w:number,h:number,d:number,color:string,limit:number,delay:number,dx:number,dz:number,lift:number,spin:number,tilt:number, glass:boolean};
  const pieces:Piece[]=[];
  s.assets.filter(a=>a.buildingType!=='road').forEach((a,idx)=>{
    const rand=random(s.randomSeed*101+idx*773), w=a.width,h=a.height,d=w*.8;
    const office=a.buildingType==='office',house=a.buildingType==='house', floors=office?5:Math.max(1,Math.round(h/5));
    const wall=house?['#b17f61','#c3a788','#916c57'][idx%3]:office?'#737f80':'#a79e89';
    function add(x:number,y:number,z:number,b:number,c:number,e:number,color:string,limit=2,glass=false,tilt=0){
      pieces.push({a,x:x+a.worldX,y,z:z+a.worldZ,w:b,h:c,d:e,color,limit,glass,tilt,delay:rand()*1.3,
        dx:(x/(w*.5)+rand()-.25)*11,dz:(z/(d*.5)+rand()-.5)*9,lift:4+rand()*9,spin:(rand()-.5)*3});
    }
    add(0,.09,0,w+4,.18,d+4,'#9a9183');
    add(0,.23,0,w+1,.46,d+1,'#756f60');
    for(let f=0;f<floors;f++){
      const floor=h/floors,y=f*floor;
      add(0,y+.38,0,w,.65,d,'#675e50',f===0?2:.34);
      for(const x of [-1,1])for(const z of [-1,1])add(x*w*.44,y+floor*.5,z*d*.44,.58,floor,.58,'#624e3e',.35);
      add(0,y+floor*.49,0,w*.54,floor*.92,d*.48,'#574d43',.35);
      for(const sign of [-1,1]){
        for(let i=-1;i<=1;i++){
          const x=i*w/3,z=sign*d*.5;
          const fracture=.16+rand()*.20;
          add(x,y+floor*.5,z,w/3-.06,floor-.12,.35,wall,fracture);
          add(x,y+floor*.57,z+sign*.21,w*.23,floor*.46,.14,'#80a9a6',.07+rand()*.15,true);
        }
        add(sign*w*.5,y+floor*.5,0,.36,floor-.1,d,wall,.31);
        add(sign*(w*.5+.21),y+floor*.58,0,.1,floor*.41,d*.69,'#829f9a',.12,true);
      }
    }
    for(let i=0;i<4;i++)add((i-1.5)*w/4,h+.35+(house?(1.5-Math.abs(i-1.5))*w*.11:0),0,w/4+.32,.7,d+.65,house?'#63554a':'#556266',.10+i*.035,false,house?(i<2?.42:-.42):0);
    add(w*.18,h+1.2,0,w*.23,1.6,d*.22,'#87918d',.15);
    if(a.buildingType==='substation'||a.buildingType==='telecom'){
      add(w*.55,h*.55,0,.5,h*1.1,.55,'#665941',.18);
      add(w*.55,h,0,3,.4,.45,'#6d6153',.17);
    }else add(0,Math.min(3,h*.45),d*.52,w*.45,1.1,.22,'#bc9657',.18);
  });
  return pieces;
}
// Add panel seams, glazing bars and weathering without adding geometry or draws.
function surface(shader:Parameters<T.MeshStandardMaterial['onBeforeCompile']>[0]){
  shader.vertexShader='varying vec2 panelUV; varying float glazing;\n'+shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
    panelUV=uv;
    glazing=step(instanceColor.r+.012,instanceColor.g)*step(instanceColor.r+.012,instanceColor.b);`);
  shader.fragmentShader='varying vec2 panelUV; varying float glazing;\n'+shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
    vec2 uv=panelUV;
    float grain=fract(sin(dot(floor(uv*vec2(150.,65.)),vec2(12.9898,78.233)))*43758.5453);
    diffuseColor.rgb*=.95+.07*grain;
    float seam=smoothstep(.012,.028,min(min(uv.x,1.-uv.x),min(uv.y,1.-uv.y)));
    diffuseColor.rgb*=mix(.75,1.,seam);
    if(glazing>.5){
      float bar=smoothstep(.018,.04,abs(fract(uv.x*3.+.5)-.5));
      diffuseColor.rgb*=mix(.35,1.,bar)*(.56+.55*uv.y);
      diffuseColor.rgb+=vec3(.06,.08,.08)*smoothstep(.61,.69,uv.y+uv.x*.16);
    }`);
}
type Props={scenario:Scenario;phase:number;clock:{current:number};flight:boolean;vision:string;onInspect:(a:Asset)=>void};
export function District({scenario,phase,clock,flight,vision,onInspect}:Props){
  const pieces=useMemo(()=>structure(scenario),[scenario]);
  const ref=useRef<T.InstancedMesh>(null!);
  const obj=useMemo(()=>new T.Object3D(),[]),color=useMemo(()=>new T.Color(),[]), tint=useMemo(()=>new T.Color('#bb7359'),[]);
  const previous=useRef(Number.NaN);
  useLayoutEffect(()=>{previous.current=NaN;},[pieces,phase,vision]);
  useFrame(()=>{
    const t=phase>=3?40:phase===2?clock.current:-10;
    if(previous.current===t || (previous.current>12 && t>12))return;
    const repaint=!Number.isFinite(previous.current)||((previous.current<0)!==(t<0))||phase===2;
    previous.current=t;
    pieces.forEach((p,i)=>{
      const a=p.a, severity=a.directDamage?a.scenarioRisk*(.85+scenario.severity*.6):0;
      const age=Math.max(0,t-arrival(a)-p.delay), moving=severity>=p.limit && age>0;
      obj.position.set(p.x,p.y,p.z);obj.scale.set(p.w,p.h,p.d);obj.rotation.set(0,0,p.tilt);
      if(moving){
        const gravity=17, floor=Math.min(p.h,p.d)*.5+.15;
        const land=(p.lift+Math.sqrt(p.lift*p.lift+2*gravity*Math.max(0,p.y-floor)))/gravity;
        const air=Math.min(age,land),fall=Math.min(1,air/land),bounce=Math.max(0,age-land);
        obj.position.x+=p.dx*fall;obj.position.z+=p.dz*fall;
        obj.position.y=Math.max(floor,p.y+p.lift*air-gravity*.5*air*air)+Math.abs(Math.sin(bounce*9))*Math.exp(-bounce*4)*.8;
        obj.rotation.set(fall*(p.d<p.h?Math.PI/2:.12),p.spin*fall,.16*Math.sin(p.spin)*fall);
        if(p.glass)obj.scale.multiplyScalar(1-.75*fall);
      }
      obj.updateMatrix();ref.current.setMatrixAt(i,obj.matrix);
      if(repaint){
        const dark=phase>=2&&a.failed&&t>=arrival(a);
        color.set(p.glass&&dark?'#263638':p.color);
        if(vision==='Risk'&&dark&&!p.glass)color.lerp(tint,.15);
        ref.current.setColorAt(i,color);
      }
    });
    ref.current.instanceMatrix.needsUpdate=true;if(repaint&&ref.current.instanceColor)ref.current.instanceColor.needsUpdate=true;
  });
  return <instancedMesh ref={ref} args={[undefined,undefined,pieces.length]} frustumCulled={false} castShadow receiveShadow onClick={e=>{if(!flight&&e.instanceId!==undefined&&e.delta<4){e.stopPropagation();onInspect(pieces[e.instanceId].a);}}}>
    <boxGeometry/><meshStandardMaterial roughness={.78} metalness={.12} onBeforeCompile={surface}/>
  </instancedMesh>;
}
