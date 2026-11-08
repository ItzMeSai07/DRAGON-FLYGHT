import {Losses,Flood} from './flight/BlockRun';
import {PowerLines} from './flight/PowerLines';
import {Sky} from './flight/Sky';
import {FlightRig} from './flight/FlightRig';
import {District} from './flight/District';
import {Weather} from './flight/Weather';
import {Streets} from './flight/Streets';
import {MapView} from './MapView';
import {Canvas,useFrame} from '@react-three/fiber';
import {PerformanceMonitor,Line} from '@react-three/drei';
import {useState,useLayoutEffect,useRef,useEffect,useMemo,Component,type ReactNode} from 'react';
import * as THREE from 'three';
import type {Asset,Scenario} from './types';
type Props={opening?:{current:number};children?:ReactNode;onPosition?:(x:number,y:number,z:number)=>void;compact:boolean;flood:boolean;scenario:Scenario;vision:string;phase:number;paused:boolean;onInspect:(a:Asset)=>void;flight:boolean;autopilot:boolean;blocked:boolean;quality:string;sway:boolean;reset:number};
const phases=['Normal','Scenario warning','Impact','Aftermath','Response'];

function Label({name,failed,height}:{name:string;failed:boolean;height:number}){
 const texture=useMemo(()=>{const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=128;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#102b32';ctx.fillRect(0,0,1024,128);ctx.strokeStyle=failed?'#e79a83':'#83b5ac';ctx.lineWidth=5;ctx.strokeRect(3,3,1018,122);ctx.fillStyle=failed?'#f1b09e':'#d9eeea';ctx.font='500 34px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(name+(failed?' · disrupted':''),512,64,970);return new THREE.CanvasTexture(canvas)},[name,failed]);
 useEffect(()=>()=>texture.dispose(),[texture]);
 return <sprite position={[0,height+7,0]} scale={[37,4.6,1]}><spriteMaterial map={texture} depthTest={false} transparent/></sprite>
}
function Scene(p:Props){
 const elapsed=useRef(0),fracture=useRef(0);
 useLayoutEffect(()=>{elapsed.current=0;},[p.phase,p.scenario.randomSeed,p.reset]);
 useFrame((_,dt)=>{if(!p.paused)elapsed.current+=Math.min(dt,.06);fracture.current=p.opening?Math.max(0,p.opening.current-139):elapsed.current;},-1);
 return <>
 <color attach="background" args={[p.opening?'#6d7f88':'#cad1c6']}/><fog attach="fog" args={[p.opening?'#6d7f88':'#cad1c6',p.opening?180:85,p.opening?780:560]}/>
 <hemisphereLight args={['#e4eafb','#786044',1.7]}/>
 <mesh rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[1000,1000]}/><meshStandardMaterial color="#788369"/></mesh>
 <District flight={p.flight||p.autopilot} scenario={p.scenario} vision={p.vision} phase={p.flood?0:p.phase} clock={fracture} onInspect={p.onInspect}/>
 <Streets compact={p.compact} scenario={p.scenario} phase={p.flood?0:p.phase} paused={p.paused}/>
 {p.scenario.assets.filter(a=>a.criticality===3 && !p.flight && !p.autopilot).map(a=><group key={a.id} position={[a.worldX,0,a.worldZ]}><Label height={a.height} name={a.name} failed={p.phase>=2&&a.failed}/></group>)}
 {p.vision==='Dependencies'&&p.scenario.edges.filter(e=>e.relationshipType==='POWERED_BY').map((e,i)=>{const a=p.scenario.assets.find(a=>a.id===e.sourceId)!,b=p.scenario.assets.find(a=>a.id===e.targetId)!;return <Line key={i} points={[[a.worldX,a.height+3,a.worldZ],[b.worldX,b.height+3,b.worldZ]]} color={p.phase>=2&&b.failed?'#f58c70':'#79ebdb'} lineWidth={1.4} transparent opacity={.6}/>})}
 {p.children}<PowerLines scenario={p.scenario} phase={p.phase} clock={elapsed}/><Sky phase={p.phase} paused={p.paused}/><Weather {...p} phase={p.flood||(p.opening&&p.phase===1)?0:p.phase} clock={elapsed} motion={p.sway}/><Losses {...p} clock={fracture}/>{p.flood&&<Flood a={p.scenario.assets[0]} phase={p.phase} clock={elapsed}/>}<FlightRig clock={elapsed} {...p} assets={p.scenario.assets}/>
 </>}
class Boundary extends Component<{children:ReactNode;fallback:ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return{failed:true}}render(){return this.state.failed?this.props.fallback:this.props.children}}
export default function World(p:Props){const [factor,setFactor]=useState(1);return <Boundary fallback={<MapView scenario={p.scenario} onInspect={p.onInspect}/>}><Canvas shadows={p.quality!=='Low'} camera={{position:[140,100,175],fov:60,near:.5,far:1100}} dpr={Math.min(window.devicePixelRatio,(p.quality==='High'?1.8:p.quality==='Low'?1:1.3)*factor)} gl={{antialias:p.quality!=='Low'}}><PerformanceMonitor onDecline={()=>setFactor(.75)} onIncline={()=>setFactor(1)} flipflops={2} onFallback={()=>setFactor(.75)}/><Scene {...p}/></Canvas><div className="reticle">+</div>{p.flight&&<div className="speed-field"/>}<span className="scene-phase">{phases[p.phase]} · illustrative damage</span></Boundary>}
