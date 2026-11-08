import {useState} from 'react';
import {api,money,type Scenario,type Asset} from './types';
export function SimulationContext({scenario:s,phase,onInspect}:{scenario:Scenario;phase:number;onInspect:(a:Asset)=>void}){
 const [question,setQuestion]=useState('What does this damage mean for people here?'),[answer,setAnswer]=useState(''),[mode,setMode]=useState(''),[busy,setBusy]=useState(false);
 const direct=s.assets.filter(a=>a.directDamage),indirect=s.assets.filter(a=>a.failed&&!a.directDamage),c=s.community;
 const ask=async()=>{setBusy(true);try{const r=await api<{summary:string;mode:string}>('/agent/chat',{severity:s.severity,seed:s.randomSeed,interventions:s.interventions,prompt:question});setAnswer(r.summary);setMode(r.mode)}catch(e){setAnswer(String(e));setMode('Connection error')}finally{setBusy(false)}};
 return <section className="simulation-context panel">
 <h3>{['Before impact','Storm approaching','Impact in progress','Aftermath','Response'][phase]}</h3>
 <p>{phase<2?'The scene is showing conditions before damage. The figures below describe the selected scenario’s projected outcome.':'The scene illustrates the selected scenario’s outcome. Structural damage and outages explain the effects below.'} Seed {s.randomSeed} · severity {Math.round(s.severity*100)}% · {s.interventions.length?'Mitigation scenario':'Baseline scenario'}</p>
 <div className="impact-numbers">
 <div><strong>{direct.length}</strong><span>Directly damaged assets</span><small>Roof, window and structural damage</small></div>
 <div><strong>{indirect.length}</strong><span>Dependency disruptions</span><small>Service failure without direct damage</small></div>
 <div><strong>{c.potentialDisplacement}</strong><span>People potentially displaced</span><small>65% of occupants in damaged homes</small></div>
 <div><strong>{c.shelterDemand} / {c.verifiedUsableCapacity}</strong><span>Shelter demand / usable spaces</span><small>{c.unmetShelterDemand} people need additional shelter capacity</small></div>
 <div><strong>{money(s.business.totalModeledLoss)}</strong><span>Modeled financial exposure</span><small>Repairs and business interruption</small></div>
 </div>
 <p><b>Essential services affected</b> {c.serviceGaps.length?c.serviceGaps.join(', '):'No service gaps in this outcome.'}</p>
 <div className="damage-list">{s.assets.filter(a=>a.failed).sort((a,b)=>b.criticality-a.criticality).slice(0,6).map(a=><button key={a.id} onClick={()=>onInspect(a)}><b>{a.name}</b><span>{a.directDamage?'Direct damage':'Dependency outage'} · {a.downtimeDays} days · {money(a.totalModeledLoss)}</span><small>{a.reasons.join(' · ')} · capacity {a.occupantCapacity}</small></button>)}</div>
 <small>Fictional population and assets. Asset damage is an assumption-based mapping of the event model score. Animation timing does not represent additional predictions.</small>
 <h3 style={{marginTop:22}}>Ask about this simulation</h3>
 <form onSubmit={e=>{e.preventDefault();if(question.trim())void ask()}}><textarea aria-label="Simulation chatbot question" value={question} onChange={e=>setQuestion(e.target.value)} maxLength={4000}/><button className="primary" disabled={busy||!question.trim()}>{busy?'Analyzing scenario…':'Ask assistant'}</button></form>
 {answer&&<div className="simulation-answer" role="status"><b>{mode}</b><p>{answer}</p></div>}
 </section>
}
