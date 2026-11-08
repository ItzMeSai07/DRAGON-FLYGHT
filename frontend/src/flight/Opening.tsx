import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import World from '../World';
import {money,type Scenario} from '../types';
import {beats,beatIndex,manual} from './openingDirector';
import {OpeningSet} from './OpeningSet';
import './opening.css';

const noop=()=>{};
const bay=[8,7,24], shop=[17,12,-12];
function timecode(t:number){return Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0');}
export default function Opening({scenario}:{scenario:Scenario}){
 const [run,replay]=useState(0);
 return <Prologue key={run} scenario={scenario} replay={()=>replay(n=>n+1)}/>;
}
function Prologue({scenario:s,replay}:{scenario:Scenario;replay:()=>void}){
 const [started,start]=useState(false),[paused,pause]=useState(false),[seconds,display]=useState(0),[recap,page]=useState(0),[quality,setQuality]=useState('Medium');
 const [reports,report]=useState<number[]>([]),[range,setRange]=useState(999);
 const clock=useRef(0),distance=useRef(0),speed=useRef(0),last=useRef<number[]|null>(null),skips=useRef(0),manualTime=useRef(0),audio=useRef<AudioContext|null>(null);
 const stage=beatIndex(seconds),beat=beats[stage],finished=seconds>=180,control=manual(stage)&&!paused&&started&&!finished;
 const block=useMemo(()=>{
   const hero=s.assets.filter(a=>a.directDamage&&a.buildingType!=='road').sort((a,b)=>b.repairExpense-a.repairExpense)[0]??s.assets.find(a=>a.buildingType==='retail')!;
   const types=['pharmacy','shelter','house','office','grocery'];
   const buildings=[hero,...types.map(type=>s.assets.find(a=>a.buildingType===type&&a.id!==hero.id)!)];
   const lots=[[17,-12],[8,12],[-28,10],[-18,-18],[35,24],[-42,-35]];
   return {...s,edges:[],assets:buildings.map((a,i)=>({...a,name:i===0?'Market Street shop':a.name,worldX:lots[i][0],worldZ:lots[i][1],height:i===0?11:i===1?12:Math.min(a.height,20),width:i===0?19:14,failed:i===0,directDamage:i===0,scenarioRisk:i===0?Math.min(.95,.3+a.scenarioRisk):0}))};
 },[s]);
 useEffect(()=>{
   if(!started||paused||finished)return;
   let frame=0,previous=performance.now();
   function resetSample(){previous=performance.now()}
   document.addEventListener('visibilitychange',resetSample);
   function tick(now:number){const dt=Math.max(0,(now-previous)/1000);previous=now;
     if(!document.hidden){if(manual(beatIndex(clock.current)))manualTime.current+=dt;clock.current=Math.min(beats[beatIndex(clock.current)][1],clock.current+dt*(manual(beatIndex(clock.current))?1:2));display(Math.floor(clock.current));}
     frame=requestAnimationFrame(tick);
   }frame=requestAnimationFrame(tick);return()=>{cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',resetSample)};
 },[started,paused,finished]);
 useEffect(()=>()=>{void audio.current?.close()},[]);
 useEffect(()=>{
   if(!started||paused||seconds<40||finished||!audio.current)return;
   const ctx=audio.current,osc=ctx.createOscillator(),gain=ctx.createGain(),now=ctx.currentTime;
   const deep=seconds===90||seconds===143||seconds===145;osc.type=deep?'sawtooth':'triangle';
   osc.frequency.setValueAtTime(deep?90:800+(seconds*347)%1100,now);osc.frequency.exponentialRampToValueAtTime(deep?26:300,now+.12);
   gain.gain.setValueAtTime(deep?.09:.03,now);gain.gain.exponentialRampToValueAtTime(.0001,now+(deep?.8:.1));osc.connect(gain).connect(ctx.destination);osc.start();osc.stop(now+1);osc.onended=()=>{osc.disconnect();gain.disconnect()};
 },[seconds,started,paused,finished]);
 const track=useCallback((x:number,y:number,z:number)=>{
   if(!control){last.current=null;return}
   const now=performance.now(),prior=last.current;
   if(prior&&now-prior[3]<180){const d=Math.hypot(x-prior[0],y-prior[1],z-prior[2]);if(d<7){distance.current+=d;speed.current=Math.max(speed.current,Math.min(105,d/Math.max(.01,(now-prior[3])/1000)))}}
   last.current=[x,y,z,now];const target=stage===3?bay:shop;setRange(Math.round(Math.hypot(x-target[0],y-target[1],z-target[2])));
 },[control,stage]);
 const scan=useCallback(()=>{if(control&&range<=22)report(r=>r.includes(stage)?r:[...r,stage])},[control,range,stage]);
 useEffect(()=>{const press=(e:KeyboardEvent)=>{if(e.code==='KeyX')scan()};window.addEventListener('keydown',press);return()=>window.removeEventListener('keydown',press)},[scan]);
 const hero=block.assets[0],preventable=Math.round(hero.repairExpense*.12),recovered=reports.includes(3)?preventable:0;
 const total=hero.repairExpense+hero.revenueAtRisk+hero.extraRecoveryExpense+preventable-recovered;
 if(finished)return <section className="opening-report"><small>WILLOW CREEK / PROLOGUE</small><h1>{recap===0?'Impact report':'Flight record'}</h1>
 {recap===0?<><p>Opening block · simulated costs. A loading-bay scan moves two crew members and exposed supplies under cover.</p>
 <dl>{Object.entries({'Building repairs':money(hero.repairExpense),'Business interruption':money(hero.revenueAtRisk),'Recovery expenses':money(hero.extraRecoveryExpense),'Exposed supplies lost':money(preventable-recovered),'Total modeled loss':money(total),'Potentially avoidable':money(preventable),'Loss avoided by your flight':money(recovered),'People helped':reports.includes(3)?2:0,'People rescued':0}).map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
 <p>Repair and business estimates use the selected regional asset. Supplies are a game assumption of 12% of its repair estimate. The regional shelter shortfall is {s.community.unmetShelterDemand} spaces. No rescue takes place during this opening.</p><button className="primary" onClick={()=>page(1)}>View flight record →</button></>:<><dl>{Object.entries({'Distance flown under player control':Math.round(distance.current)+' m','Peak speed':Math.round(speed.current)+' m/s','Manual flight time':Math.round(manualTime.current)+' s','Field reports':reports.length+' / 2','Shots skipped':skips.current}).map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl><p>Maya’s next assignment: investigate the pharmacy circuit. The opening ends here.</p><button className="secondary" onClick={()=>page(0)}>Impact report</button> <button className="primary" onClick={replay}>Replay opening</button></>}</section>;
 return <section className={started?"opening playing":"opening"}><div className="opening-screen">
 <World opening={clock} scenario={block} compact flight autopilot={false} flood={false} phase={seconds<40?0:seconds<90?1:2} paused={!started||paused} blocked={!control} quality={quality} sway reset={0} vision="Normal" onInspect={noop} onPosition={track}>
 <OpeningSet clock={clock} stage={stage} seed={s.randomSeed} cover={reports.includes(3)}/></World>
 {!started?<div className="opening-title"><small>WILLOW CREEK · PROLOGUE</small><h1>The Storm Protocol</h1><p>One scout. A city in the path of the storm.</p><button className="primary" onClick={()=>{try{audio.current=new AudioContext();void audio.current.resume()}catch{}start(true)}}>Begin opening ▸</button></div>:<>
 <div className="opening-top"><span>WILLOW CREEK　{beat[2]}</span><div><button onClick={()=>pause(!paused)}>{paused?'Resume':'Pause'}</button>{!manual(stage)&&<button onClick={()=>{skips.current++;clock.current=beat[1];display(beat[1]);}}>Skip shot ▸</button>}</div></div>
 <div className="opening-caption"><small>{beat[3]} · RADIO</small><p>{beat[4]}</p>
 {manual(stage)&&<b>{reports.includes(stage)?(stage===3?'Bay verified · two crew sheltered':'Roof survey logged'):beat[2]+' · '+range+' m'}　{!reports.includes(stage)&&<button disabled={!control||range>22} onClick={scan}>Scan [X]</button>}</b>}</div></>}
 </div><div className="opening-controls"><span>↑ / W fly　← → steer　Space / Shift climb / dive　E boost　C dodge　X scan</span><label>Graphics <select value={quality} onChange={e=>setQuality(e.target.value)}>{['Low','Medium','High'].map(q=><option key={q}>{q}</option>)}</select></label></div></section>;
}
