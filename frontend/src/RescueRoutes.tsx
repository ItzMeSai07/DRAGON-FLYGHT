import {useEffect,useMemo,useState} from 'react';
import {api} from './types';
import {HoustonMap,geographic,type MapConfig,type MapFrame,type MapDrone} from './HoustonMap';
import './rescue.css';
type Run={frames:MapFrame[];saved:number;reached:number;risk:number;returned:boolean};
type Result={runs:number;summary:Record<string,{average:number;worst:number;returnRate:number}>;improvement:number;optimized:Run;nearest:Run;occupancy:Record<string,number>;inputs:{epicenter:number[];severity:number;drones:number;timestamp:string}};
const emptyOccupancy:Record<string,number>={};
function alongPath(path:number[][],fraction:number){
 if(path.length<2)return path[0]||[0,0,150];
 const lengths=path.slice(1).map((p,i)=>Math.hypot(...p.map((v,j)=>v-path[i][j]))),total=lengths.reduce((a,b)=>a+b,0);let remaining=total*fraction;
 for(let i=0;i<lengths.length;i++){if(remaining<=lengths[i]){const f=lengths[i]?remaining/lengths[i]:0;return path[i].map((v,j)=>v+(path[i+1][j]-v)*f)}remaining-=lengths[i]}
 return path[path.length-1];
}
function animateFrame(frame:MapFrame|undefined,fraction:number){return frame?{...frame,drones:frame.drones.map(d=>({...d,pos:alongPath(d.path,fraction)}))}:undefined}
export default function RescueRoutes(){
 const [config,setConfig]=useState<MapConfig|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[result,setResult]=useState<Result|null>(null),[tick,setTick]=useState(0),[fraction,setFraction]=useState(1),[playing,play]=useState(false),[speed,setSpeed]=useState(1),[severity,setSeverity]=useState(.7),[drones,setDrones]=useState(2),[timestamp,setTimestamp]=useState('2026-11-08T12:00'),[epicenter,setEpicenter]=useState([0,0]),[runs,setRuns]=useState(3),[mapOpen,showMap]=useState(false);
 useEffect(()=>{api<MapConfig>('/rescue/config?city=houston').then(setConfig).catch(e=>setError(String(e)))},[]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.repeat||(e.target as HTMLElement).matches('input,textarea,select')||e.metaKey||e.ctrlKey)return;if(e.code==='KeyM'){e.preventDefault();showMap(v=>!v)}if(e.code==='Escape')showMap(false)};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[]);
 useEffect(()=>{
 if(!playing||!result)return;
 let request=0,previous=performance.now(),position=tick+fraction;
 const count=result.optimized.frames.length;
 function animate(now:number){
   position+=(now-previous)/1000*speed/2;previous=now;
   if(position>=count){setTick(count-1);setFraction(1);play(false);return}
   setTick(Math.floor(position));setFraction(position%1);request=requestAnimationFrame(animate);
 }
 request=requestAnimationFrame(animate);
 return()=>cancelAnimationFrame(request);
 },[playing,speed,result]);
 const frame=result?.optimized.frames[tick],baseline=result?.nearest.frames[tick];
 const visibleFrame=useMemo(()=>animateFrame(frame,fraction),[frame,fraction]),visibleBaseline=useMemo(()=>animateFrame(baseline,fraction),[baseline,fraction]);
 const occupancy=result?.occupancy||emptyOccupancy,stormCenter=result?.inputs.epicenter||epicenter;
 async function run(){setBusy(true);play(false);setError('');try{const r=await api<Result>('/rescue/compare',{city:'houston',disaster:'hurricane',severity,drones,timestamp:timestamp+':00-06:00',epicenter,runs,steps:10});setResult(r);setTick(0);setFraction(0);play(true)}catch(e){setError(String(e))}finally{setBusy(false)}}
 function togglePlayback(){if(!result)return;if(tick===9&&!playing){setTick(0);setFraction(0)}play(v=>!v)}
 const lead=visibleFrame?.drones[0],activeBuilding=config?.buildings.find(b=>b.id===lead?.target),location=config&&lead?geographic(config,lead.pos):null;
 return <section className="rescue houston-lab"><div className="rescue-title"><div><span className="eyebrow">DRAGONFLY / AUTONOMOUS SEARCH & ASSISTANCE</span><h1>Houston. Every minute matters.</h1><p>A hurricane stress scenario. A fleet that replans around danger.</p></div><button className="primary" onClick={()=>showMap(true)}>Open mission map <kbd>M</kbd></button></div>
 <div className="rescue-controls"><label>Location<strong>Houston, Texas</strong><small>Downtown pilot</small></label><label>Disaster<strong>Hurricane</strong><small>Hypothetical inland wind & debris</small></label><label>Scenario time · UTC−06:00<input type="datetime-local" value={timestamp} onChange={e=>setTimestamp(e.target.value)}/></label><label>Storm severity · {Math.round(severity*100)}%<input aria-label="Storm severity" type="range" min="0" max="1" step=".05" value={severity} onChange={e=>setSeverity(+e.target.value)}/></label><label>Drones<input aria-label="Drone count" type="number" min="1" max="4" value={drones} onChange={e=>setDrones(+e.target.value)}/></label><label>Paired trials<input aria-label="Trial count" type="number" min="1" max="10" value={runs} onChange={e=>setRuns(+e.target.value)}/></label><button className="primary" disabled={busy||!config||!timestamp||drones<1||drones>4||runs<1||runs>10} onClick={run}>{busy?'Calculating safe routes…':result?'Run new scenario':'Launch simulation'}</button></div>
 {error&&<p role="alert">{error}</p>}
 <div className="rescue-layout"><div className="tactical-stage"><div className="tactical-caption"><span>HOUSTON / DOWNTOWN</span><span>{busy?'SOLVING 3D ROUTES':playing?'MISSION PLAYBACK':result?'MISSION PAUSED':'READY TO LAUNCH'}</span></div>
 <svg className="rescue-tactical" viewBox="-680 -680 1360 1360" role="img" aria-label="Houston hurricane mission tactical view" onClick={e=>{if(playing)return;const r=e.currentTarget.getBoundingClientRect();setEpicenter([Math.max(-550,Math.min(550,Math.round((e.clientX-r.left)/r.width*1360-680))),Math.max(-550,Math.min(550,Math.round(680-(e.clientY-r.top)/r.height*1360)))])}}>
 <defs><pattern id="houston-grid" width="100" height="100" patternUnits="userSpaceOnUse"><path d="M 100 0 L 0 0 0 100" fill="none" stroke="#31576b" strokeWidth="1"/></pattern><radialGradient id="storm-band"><stop stopColor="#ff735c" stopOpacity=".4"/><stop offset="1" stopColor="#ff735c" stopOpacity=".03"/></radialGradient></defs>
 <rect x="-680" y="-680" width="1360" height="1360" fill="#071c2a"/><rect x="-680" y="-680" width="1360" height="1360" fill="url(#houston-grid)"/>
 {config?.buildings.map(b=>b.outline?<polygon key={b.id} points={b.outline.map(p=>((p.lng-config.city.origin[1])*(config.city.longitude_m_per_degree||96350))+','+-((p.lat-config.city.origin[0])*111000)).join(' ')} fill="#5b9bab" opacity={Math.min(.8,.25+(occupancy[b.id]||0)/600)} stroke="#8fc7d0" strokeWidth="1"><title>{b.name} · estimated occupants {occupancy[b.id]?.toFixed(0)||'run scenario'}</title></polygon>:null)}
 {(visibleFrame?.hazard.zones||[]).map((z,i)=><g key={i}><circle cx={z.x} cy={-z.y} r={z.radius+35} fill="url(#storm-band)"/><circle cx={z.x} cy={-z.y} r={z.radius} fill="#ff765b22" stroke="#ff997b" strokeDasharray="8 10" strokeWidth="3"/></g>)}
 <g transform={`translate(${stormCenter[0]},${-stormCenter[1]})`}><circle r="15" fill="#ff5477"/><circle r="30" fill="none" stroke="#ff5477"/><title>Scenario storm center</title></g>
 {[[-600,-600],[600,600]].map(([x,y],i)=><g key={i} transform={`translate(${x},${-y})`}><rect x="-18" y="-18" width="36" height="36" fill="#0f4750" stroke="#6be8da" strokeWidth="3"/><text y="-30" textAnchor="middle" fill="#a5e6dc" fontSize="22">BASE {i+1}</text></g>)}
 {[[visibleBaseline,'#ffbe61'],[visibleFrame,'#60e8f0']].map(([f,color],i)=>(f as MapFrame|undefined)?.drones.map(d=><g key={i+'-'+d.id}><polyline points={(d.plannedPath||d.path).map(p=>p[0]+','+-p[1]).join(' ')} fill="none" stroke={color as string} opacity=".65" strokeWidth="4" strokeDasharray={i===0?'9 9':undefined}/><g transform={`translate(${d.pos[0]},${-d.pos[1]})`} className="tactical-drone"><ellipse rx="20" ry="6" transform="rotate(35)" fill={color as string}/><ellipse rx="20" ry="6" transform="rotate(-35)" fill={color as string}/><path d="M0 -18V26" stroke={color as string} strokeWidth="4"/><text x="25" y="-12" fill={color as string} fontSize="23">{i===1?'D':'B'}{d.id+1}</text></g></g>))}
 <text x="590" y="-600" fill="#a3d4df" fontSize="30">N ↑</text></svg>
 <div className="tactical-legend"><span className="cyan">━ Rescue priority</span><span className="amber">┄ Nearest-first</span><span>Shading = estimated occupancy</span></div><div className="rescue-playback"><button onClick={()=>{setTick(0);setFraction(0);play(false)}} disabled={!result}>Reset</button><button disabled={!result} onClick={togglePlayback}>{playing?'Pause':'Play'}</button><select aria-label="Playback speed" value={speed} onChange={e=>setSpeed(+e.target.value)}>{[1,2,4].map(v=><option key={v} value={v}>{v}×</option>)}</select><input aria-label="Simulation minute" type="range" min="0" max="9" value={tick} onChange={e=>{play(false);setTick(+e.target.value);setFraction(1)}} disabled={!result}/><span>{frame?.minute||0} / 10 min</span></div><small>3D A* routes projected from above. Replanned each simulated minute. Click while paused to choose the next scenario’s storm center.</small></div>
 <aside className="panel mission-telemetry"><span className="eyebrow">ACTIVE MISSION</span><h2>{lead?'Dragonfly '+(lead.id+1):'Awaiting launch'}</h2><p>{activeBuilding?.name||lead?.status||'Choose scenario inputs and launch.'}</p>{location&&<small>{location.lat.toFixed(5)}, {location.lng.toFixed(5)} · {lead?.pos[2]} m altitude</small>}
 <dl>{[['Estimated people reached',frame?.reached],['Expected lives saved · modeled',frame?.saved],['Nearest-first · same conditions',baseline?.saved]].map(([k,v])=><div key={String(k)}><dt>{k}</dt><dd>{typeof v==='number'?v.toFixed(1):'—'}</dd></div>)}</dl>
 {frame?.drones.map(d=><div className="drone-telemetry" key={d.id}><b>Dragonfly {d.id+1}</b><span>{d.battery.toFixed(1)} Wh</span><progress max="180" value={d.battery}/><small>{d.status}</small></div>)}
 {result&&<div className="comparison-summary"><h3>{result.runs} paired trials</h3><p>Mean modeled gain <strong>{result.improvement.toFixed(1)}</strong></p>{Object.entries(result.summary).map(([k,v])=><p key={k}><b>{k==='optimized'?'Rescue priority':'Nearest-first'}</b><br/>Mean {v.average.toFixed(1)} · worst {v.worst.toFixed(1)}<br/>Returned {(v.returnRate*100).toFixed(0)}%</p>)}</div>}
 <button className="secondary full" onClick={()=>showMap(true)}>Locate fleet on Google Maps · M</button></aside></div>
 <details className="panel rescue-evidence"><summary>Sources, assumptions & mission limits</summary><p>{config?.notice}</p><p>Real OSM building outlines. Unknown building levels default to three; unknown use defaults to office. Census counts, live person locations, actual assistance requests, current airspace restrictions, and real hurricane forecasts are not connected. Population density, survival, wind, and drone performance are student-model assumptions.</p><p>Expected assisted survival uses a 15% assistance-success assumption for surviving people reached. The drone does not evacuate passengers. The heuristic can underperform nearest-first; the comparison shows either result. The full Houston map is available through Google Maps; detailed flight calculations cover this 1.3 km downtown pilot and twelve altitude-reachable targets.</p><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors · ODbL ↗</a></details>
 {config&&<HoustonMap config={config} frame={visibleFrame} baseline={visibleBaseline} occupancy={occupancy} epicenter={stormCenter} onEpicenter={setEpicenter} open={mapOpen} onClose={()=>showMap(false)}/>}</section>
}
