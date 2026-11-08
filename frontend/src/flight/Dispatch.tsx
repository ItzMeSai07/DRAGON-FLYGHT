import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Html} from '@react-three/drei';
import World from '../World';
import {money,type Scenario} from '../types';

type Job='power'|'roof';
const manifest={address:'18 Prairie Lane',meter:'TX-407'};
const outage={address:'Prairie service entrance B',meter:'TX-407',circuit:'C-4'};
const sites=['pharmacy','substation','retail','shelter'];
const locations=[[7,17],[-23,-13],[24,-14],[-22,17]];
const noop=()=>{};
export default function Dispatch({scenario}:{scenario:Scenario}){
 const [round,setRound]=useState(0);
 return <Mission key={round+scenario.id} scenario={scenario} replay={()=>setRound(n=>n+1)}/>;
}
function Mission({scenario,replay}:{scenario:Scenario;replay:()=>void}){
 const [running,start]=useState(false),[time,setTime]=useState(0),[records,scan]=useState<string[]>([]),[job,dispatch]=useState<{type:Job;sent:number}|null>(null);
 const [nearest,setNearest]=useState(-1),previous=useRef(-1);
 const risk=scenario.prediction.riskScore??scenario.severity;
 const battery=Math.round(85-22*risk), roofLimit=90;
 const eta=job?job.sent+(job.type==='power'?12:8):Infinity;
 const done=running&&(time>=eta||time>=180);
 const powered=job?.type==='power'&&time>=eta;
 const linked=records.includes('pharmacy')&&records.includes('substation')&&manifest.meter===outage.meter;
 const assets=useMemo(()=>sites.map((type,i)=>{
   const a=scenario.assets.find(a=>a.buildingType===type)!;
   return {...a,worldX:locations[i][0],worldZ:locations[i][1],width:Math.min(13,a.width),height:Math.min(12,a.height),failed:i===2||!powered,directDamage:i===2,scenarioRisk:i===2?.35+risk*.18:a.scenarioRisk};
 }),[scenario,powered,risk]);
 const block=useMemo(()=>({...scenario,assets,edges:[]}),[scenario,assets]);
 const stock=Math.round(assets[0].annualRevenue/365*4), roof=Math.round(assets[2].replacementCost*.018*(1+risk));
 const saved=powered&&eta<=battery?stock:job?.type==='roof'&&time>=eta&&eta<=roofLimit?roof:0;
 const shelter=scenario.community.shelters.find(s=>s.buildingId===assets[3].id)?.confirmedAvailableCapacity??0;
 useEffect(()=>{if(!running||done)return;const timer=setInterval(()=>setTime(t=>t+1),1000);return()=>clearInterval(timer)},[running,done]);
 const track=useCallback((x:number,y:number,z:number)=>{
   let best=-1,distance=19;
   assets.forEach((a,i)=>{const d=Math.hypot(x-a.worldX,z-a.worldZ,Math.max(0,y-a.height));if(d<distance){best=i;distance=d}});
   if(best!==previous.current){previous.current=best;setNearest(best)}
 },[assets]);
 const collect=useCallback(()=>{if(!running||done||nearest<0)return;const site=sites[nearest];scan(prev=>prev.includes(site)?prev:[...prev,site]);},[nearest,running,done]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.code==='KeyX'&&!e.repeat)collect()};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[collect]);
 function send(type:Job){if(!job&&!done&&running)dispatch({type,sent:time});}
 const destination=assets[job?.type==='power'?1:2],progress=job?Math.min(1,(time-job.sent)/(eta-job.sent)):0;
 return <section className="dispatch-game"><header><small>TORNADO RESPONSE</small><h1>Dragonfly Dispatch</h1><p>A roof has torn open. A pharmacy is on backup power. Scout the block and choose where your one crew goes.</p></header>
 <div className="dispatch-stage"><World scenario={block} flight={running} compact flood={false} autopilot={false} phase={running?2:0} paused={!running||done} blocked={!running||done} quality="Medium" sway reset={0} vision="Normal" onPosition={track} onInspect={noop}>
 {assets.map((a,i)=><Html key={a.id} position={[a.worldX,a.height+2,a.worldZ]} center style={{pointerEvents:'none'}}><span className="dispatch-pin">{['Pharmacy','Circuit station','Shop','Shelter'][i]} {records.includes(sites[i])?'✓':''}</span></Html>)}
 <group position={[-42+progress*(destination.worldX+42),1,progress*(destination.worldZ+destination.width*.55)]}><mesh><boxGeometry args={[4,1.7,2]}/><meshStandardMaterial color="#ffab42"/></mesh><mesh position={[1,1,0]}><boxGeometry args={[1.7,1.1,1.8]}/><meshStandardMaterial color="#334f58"/></mesh></group>
 </World>
 <div className="dispatch-radio" aria-label="Mission objective">
 {!running?<button className="primary" onClick={()=>start(true)}>Launch mission</button>:done?<b>Mission complete · See your impact below</b>:job?<b>Crew en route · {eta-time}s to arrival</b>:<>
 <div><small>ONE CREW AVAILABLE</small><b>{linked?'Circuit identified. Choose where to send your crew.':records.includes('pharmacy')?'Scan the circuit station to trace the pharmacy outage.':records.includes('substation')?'Scan the pharmacy to match its meter to the outage.':'Fly to the pharmacy or shop and press X to investigate.'}</b>
 <span>{linked?`Battery: ${Math.max(0,battery-time)}s · Repair needs 12s · ${shelter} shelter places depend on power.`:records.includes('retail')?'The roof crew is ready. Dispatch now or investigate the power outage.':'Scan the shop to find out what a roof repair could save.'}</span></div>
 <div className="dispatch-actions"><button className="secondary" disabled={nearest<0||records.includes(sites[nearest])} onClick={collect}>{nearest<0?'Outside scan range':records.includes(sites[nearest])?'Site scanned':'Scan '+assets[nearest].name+' [X]'}</button>
 {linked&&<button className="primary" onClick={()=>send('power')}>Dispatch to circuit</button>}
 {records.includes('retail')&&<button className="primary" onClick={()=>send('roof')}>Dispatch to roof</button>}</div></>}
 </div></div>
 <p>↑ fly forward · hold ← / → to steer · ↓ turn around · Space / Shift altitude · X scan</p>
 {running&&<div className="panel"><h3>{done?'Mission debrief':'Crew radio'} · {time}s</h3>
 {records.includes('pharmacy')&&<p>Maintenance record · {manifest.address} · meter {manifest.meter}. {powered?'Power restored.':`Cold storage has ${Math.max(0,battery-time)}s of backup left.`} Stock exposed: {money(stock)}.</p>}
 {records.includes('substation')&&<p>Utility report · {outage.address} · meter {outage.meter} · circuit {outage.circuit} offline at impact.</p>}
 {linked&&<p>Meter match confirmed. Circuit {outage.circuit} serves the pharmacy and shelter. A repair takes 12 seconds including travel.</p>}
 {records.includes('retail')&&<p>Roof inspection · rain threatens {money(roof)} in additional interior damage. Tarp crew needs 8 seconds. Protection deadline: {roofLimit}s.</p>}
 {records.includes('shelter')&&<p>Shelter inspection · {shelter} places depend on circuit power.</p>}
 {!done&&!job&&<div className="inline"><button className="secondary" disabled={!linked} onClick={()=>send('power')}>Restore circuit</button><button className="secondary" disabled={!records.includes('retail')} onClick={()=>send('roof')}>Tarp shop roof</button></div>}
 {done&&<><p>{powered?'Circuit restored. Pharmacy and shelter have power.':job?'Crew reached the shop. The pharmacy remains on backup until its battery expires.':'The response window closed without a crew assignment.'}</p><p>No-action projected loss: {money(stock+roof)} · Your projected loss: {money(stock+roof-saved)} · Avoided: <strong>{money(saved)}</strong>. {powered?shelter:0} shelter places restored.</p><button className="primary" onClick={replay}>Replay same storm</button></>}
 </div>}<small>Fictional mission. The event score influences battery time and shop exposure. Inventory values, deadlines, crew times and shelter outcomes use game assumptions.</small></section>;
}
