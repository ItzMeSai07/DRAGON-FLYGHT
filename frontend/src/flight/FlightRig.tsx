import {cityBuildings} from './CitySkyline';
import {directOpening,type OpeningClock} from './openingDirector';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as T from 'three';
import type { Asset } from '../types';
import { arrival } from './District';
import { Dragonfly } from './Dragonfly';

const {clamp,damp} = T.MathUtils;
const spawn = new T.Vector3(8,17,39);
type Props = {opening?:OpeningClock;onPosition?:(x:number,y:number,z:number)=>void;compact:boolean;flood:boolean;flight:boolean; autopilot:boolean; reset:number; sway:boolean; assets:Asset[]; onInspect:(a:Asset)=>void; phase:number; paused:boolean; clock:{current:number}; blocked:boolean};
export function FlightRig(p:Props) {
  const {camera,gl} = useThree();
  const actor = useRef<T.Group>(null!);
  const active = p.flight || p.autopilot;
  const rig = useMemo(()=>({
    pos:spawn.clone(), velocity:new T.Vector3(), target:new T.Vector3(), chase:new T.Vector3(), aim:new T.Vector3(),
    dodge:0, dodgeSide:1, turnRate:0, uTurn:0, yaw:.45, heading:.45, pitch:-.12, boost:0, cooldown:0, cinema:true, speed:42, orbit:0, time:0, bank:0, keys:new Set<string>()
  }),[]);
  useEffect(()=>{
    rig.pos.copy(spawn); rig.velocity.set(0,0,0); rig.heading=rig.yaw=.45; rig.pitch=-.12; rig.boost=rig.cooldown=rig.time=rig.orbit=0; rig.bank=rig.turnRate=rig.uTurn=0;
    camera.position.set(...(active?[45,40,90]:[140,100,175]) as [number,number,number]);
    camera.lookAt(active?spawn:rig.target.set(0,8,0));
    return ()=>{const cam=camera as T.PerspectiveCamera;cam.fov=60;cam.updateProjectionMatrix();};
  },[active,p.reset,camera,rig]);
  useEffect(()=>{
    if (!active || p.blocked || p.autopilot) return;
    const canvas=gl.domElement; let drag=false;
    const burst=()=>{if(rig.cooldown<=0){rig.boost=.85;rig.cooldown=1.8;}};
    const down=(e:KeyboardEvent)=>{
      if((e.target as HTMLElement).matches('input,textarea,select') || e.metaKey || e.ctrlKey)return;
      if(e.code==='Space'||e.code.startsWith('Arrow'))e.preventDefault();
      rig.keys.add(e.code); if(e.repeat)return;
      if(e.code==='ArrowDown')rig.uTurn=Math.PI;
      if(e.code==='KeyE')burst();
      if(p.opening&&e.code==='KeyC'&&rig.dodge<=0){rig.dodge=.55;rig.dodgeSide=rig.keys.has('ArrowLeft')?-1:1;}
      if(e.code==='KeyQ')rig.cinema=!rig.cinema;
      if(e.code==='KeyR'){rig.pos.copy(spawn);rig.velocity.set(0,0,0);rig.yaw=.45;rig.pitch=-.12;rig.boost=0;}
      if(!p.opening&&(e.code==='KeyF'||e.code==='KeyI')){
        const score=(a:Asset)=>e.code==='KeyF'?-a.scenarioRisk:Math.hypot(a.worldX-rig.pos.x,a.height-rig.pos.y,a.worldZ-rig.pos.z);
        const a=p.assets.reduce((best,a)=>score(a)<score(best)?a:best);
        if(e.code==='KeyI'){document.exitPointerLock?.();p.onInspect(a);}
        else {rig.pos.set(a.worldX+17,a.height+9,a.worldZ+17);rig.yaw=Math.PI/4;rig.pitch=-.28;rig.velocity.set(0,0,0);}
      }
    };
    const up=(e:KeyboardEvent)=>{rig.keys.delete(e.code)};
    const start=(e:MouseEvent)=>{if(e.button===0){drag=true;burst();}};
    const stop=()=>{drag=false};
    const clear=()=>{drag=false;rig.keys.clear();rig.turnRate=rig.uTurn=0};
    const look=(e:MouseEvent)=>{if(drag||document.pointerLockElement===canvas){rig.yaw-=e.movementX*.003;rig.pitch=clamp(rig.pitch-e.movementY*.0025,-1.05,1.05);}};
    const wheel=(e:WheelEvent)=>{rig.speed=clamp(rig.speed-e.deltaY*.025,18,72)};
    const engage=()=>{try{canvas.requestPointerLock?.()?.catch(()=>{});}catch{/* drag also steers */}};
    const button=document.getElementById('engage-flight');
    button?.addEventListener('click',engage); canvas.addEventListener('mousedown',start); canvas.addEventListener('wheel',wheel);
    window.addEventListener('mouseup',stop);window.addEventListener('mousemove',look);window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',clear);
    return ()=>{clear();if(document.pointerLockElement===canvas)document.exitPointerLock();button?.removeEventListener('click',engage);canvas.removeEventListener('mousedown',start);canvas.removeEventListener('wheel',wheel);window.removeEventListener('mouseup',stop);window.removeEventListener('mousemove',look);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',clear);};
  },[active,p.blocked,p.autopilot,p.assets,p.onInspect,gl,rig]);
  useFrame((_,delta)=>{
    if(!active)return;
    if(p.opening && p.paused && p.opening.current>0)return;
    const dt=Math.min(.05,delta), k=rig.keys, v=rig.velocity;
    if(p.opening && directOpening(p.opening.current,dt,camera as T.PerspectiveCamera,actor.current,rig))return;
    const axis=(a:string,b:string)=>Number(k.has(a))-Number(k.has(b));
    const tour=p.autopilot;
    if(!tour || !p.paused)rig.time+=dt;
    if(tour){
      if(!p.paused)rig.orbit+=dt*(p.phase===2?.37:.17);
      const t=rig.orbit;
      rig.target.set(38*Math.sin(t),18+5*Math.cos(2*t),38*Math.cos(t));
      rig.target.sub(rig.pos).multiplyScalar(2).clampLength(0,76);
      if(rig.target.lengthSq()>1){const angle=p.phase===1||p.phase===2?Math.atan2(rig.pos.x-(p.flood?p.assets[0].worldX:-25),rig.pos.z-(p.flood?p.assets[0].worldZ:-17)):Math.atan2(-rig.target.x,-rig.target.z);rig.yaw=rig.heading+Math.atan2(Math.sin(angle-rig.heading),Math.cos(angle-rig.heading));}
    }else{
      const steering=axis('ArrowLeft','ArrowRight');
      if(steering)rig.uTurn=0;
      rig.turnRate=damp(rig.turnRate,steering*2.4,steering?7:12,dt);
      const pivot=Math.min(rig.uTurn,dt*3.6);
      rig.uTurn-=pivot;
      rig.yaw+=rig.turnRate*dt+pivot;
      const f=Number(k.has('KeyW')||k.has('ArrowUp'))-Number(k.has('KeyS')), s=axis('KeyD','KeyA'), h=Number(k.has('Space'))-Number(k.has('ShiftLeft')||k.has('ShiftRight'));
      const forward=rig.boost>0?Math.max(1,f):f;
      rig.target.set(-Math.sin(rig.yaw)*forward*Math.cos(rig.pitch)+s*Math.cos(rig.yaw),h+forward*Math.sin(rig.pitch),-Math.cos(rig.yaw)*forward*Math.cos(rig.pitch)-s*Math.sin(rig.yaw)).normalize().multiplyScalar(rig.boost>0?105:rig.speed);
    }
    if(p.opening&&rig.dodge>0){rig.dodge=Math.max(0,rig.dodge-dt);rig.target.x+=Math.cos(rig.yaw)*rig.dodgeSide*70;rig.target.z-=Math.sin(rig.yaw)*rig.dodgeSide*70;}
    rig.boost-=dt;rig.cooldown-=dt;
    v.lerp(rig.target,1-Math.exp(-dt*(rig.target.lengthSq()?5:3.2)));
    rig.pos.addScaledVector(v,dt); rig.pos.clampScalar(p.opening?-330:p.compact?-54:-215,p.opening?330:p.compact?54:215);rig.pos.y=clamp(rig.pos.y,2.6,155);
    const clearance=(vec:T.Vector3,margin:number)=>{for(const a of p.assets)if(a.buildingType!=='road'&&Math.abs(vec.x-a.worldX)<a.width*.55+margin&&Math.abs(vec.z-a.worldZ)<a.width*.45+margin)vec.y=Math.max(vec.y,a.height+5+margin);};
    if(p.opening)for(const b of cityBuildings){if(Math.abs(rig.pos.x-b.x)<b.width/2+2&&Math.abs(rig.pos.z-b.z)<b.width/2+2&&rig.pos.y<b.height+4){rig.pos.addScaledVector(v,-dt);v.multiplyScalar(-.2);break}}
    clearance(rig.pos,1); p.onPosition?.(rig.pos.x,rig.pos.y,rig.pos.z);
    const turn=rig.yaw-rig.heading;
    rig.heading=damp(rig.heading,rig.yaw,9,dt);rig.bank=damp(rig.bank,clamp(turn*.65+axis('KeyA','KeyD')*.27,-.75,.75),6,dt);
    const speed=v.length(), bob=p.sway?Math.sin(rig.time*3.3)*.085:0;
    actor.current.position.copy(rig.pos);actor.current.position.y+=bob;
    actor.current.rotation.set(clamp(v.y*.009,-.75,.75),rig.heading,rig.bank+(p.opening&&rig.dodge>0?Math.sin(rig.dodge/.55*Math.PI*2)*1.5*rig.dodgeSide:0),'YXZ');
    const distance=7.6+(rig.cinema?speed*.065:0), sin=Math.sin(rig.heading),cos=Math.cos(rig.heading);
    rig.chase.copy(rig.pos);rig.chase.x+=sin*distance;rig.chase.z+=cos*distance;rig.chase.y+=2.4-rig.pitch*distance*.7;
    clearance(rig.chase,.5);camera.position.lerp(rig.chase,1-Math.exp(-dt*8));clearance(camera.position,.3);
    rig.aim.copy(rig.pos);rig.aim.x-=sin*3;rig.aim.z-=cos*3;rig.aim.y+=1+rig.pitch*2;
    if(p.phase===2&&p.sway&&!p.paused){let impact=0;for(const a of p.assets){const age=p.clock.current-arrival(a)-1;if(a.directDamage&&age>=0&&age<2)impact=Math.max(impact,Math.exp(-age*2-Math.hypot(rig.pos.x-a.worldX,rig.pos.z-a.worldZ)/45));}rig.aim.x+=impact*.28*Math.sin(rig.time*41);}
    camera.lookAt(rig.aim);if(p.sway&&rig.cinema)camera.rotateZ(rig.bank*.09);
    const cam=camera as T.PerspectiveCamera;cam.fov=damp(cam.fov,56+(p.sway&&rig.cinema?Math.min(19,speed*.18):0),5,dt);cam.updateProjectionMatrix();
    gl.domElement.closest<HTMLElement>('.world')?.style.setProperty('--flight-speed',String(p.sway?clamp((speed-44)/65,0,.8):0));
  });
  return <>{active?<group ref={actor}><Dragonfly opening={p.opening}/></group>:<OrbitControls makeDefault target={[0,8,0]} maxPolarAngle={Math.PI/2.15} minDistance={30} maxDistance={450}/>}</>;
}
