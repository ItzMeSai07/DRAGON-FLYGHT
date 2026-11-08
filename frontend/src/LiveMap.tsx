import {useEffect,useRef,useState} from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {api} from './types';
import './operations.css';
import {RichardsonDemo,demoSite,type DemoHazard} from './RichardsonDemo';
type Alert={id:string;geometry:GeoJSON.Geometry|null;properties:{event:string;headline:string;areaDesc:string;severity:string;sent:string;expires:string;description:string;instruction:string|null;web:string|null;status:string}};
type Feed={status:string;retrievedAt?:string;sourceUrl:string;data:{features:Alert[]}|null};
export default function LiveMap(){
 const [siteSelected,pickSite]=useState(false),[demoHazard,setDemoHazard]=useState<DemoHazard>('Flash flood');
 const host=useRef<HTMLDivElement>(null),map=useRef<L.Map|null>(null),layers=useRef<L.LayerGroup|null>(null);
 const [feed,setFeed]=useState<Feed|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(false),[query,search]=useState(''),[severity,filter]=useState('All'),[selected,select]=useState<Alert|null>(null);
 async function refresh(){setLoading(true);try{setFeed(await api<Feed>('/operations/alerts'));setError('')}catch(e){setError(String(e))}finally{setLoading(false)}}
 useEffect(()=>{void refresh();const timer=setInterval(()=>void refresh(),300000);return()=>clearInterval(timer)},[]);
 useEffect(()=>{if(!host.current)return;const m=L.map(host.current,{minZoom:2,maxZoom:16}).setView([39,-98],4);map.current=m;
 L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',maxZoom:20}).addTo(m);layers.current=L.layerGroup().addTo(m);
 const resize=new ResizeObserver(()=>m.invalidateSize());resize.observe(host.current);return()=>{resize.disconnect();m.remove();map.current=null}},[]);
 const alerts=(feed?.data?.features||[]).filter(a=>a.properties.status==='Actual'&&Date.parse(a.properties.expires)>Date.now());
 const visible=alerts.filter(a=>(severity==='All'||a.properties.severity===severity)&&`${a.properties.event} ${a.properties.areaDesc}`.toLowerCase().includes(query.toLowerCase()));
 useEffect(()=>{const group=layers.current;if(!group)return;group.clearLayers();visible.filter(a=>a.geometry).forEach(a=>{
 const color=a.properties.severity==='Extreme'?'#ff496f':a.properties.severity==='Severe'?'#ffae45':'#48d8ed';
 const shape=L.geoJSON(a as unknown as GeoJSON.Feature,{style:{color,weight:1,fillOpacity:.12}}).addTo(group);
 
 shape.on('click',()=>{pickSite(false);select(a)});
 });L.marker([demoSite.lat,demoSite.lon],{icon:L.divIcon({className:'structure-node',html:'<span aria-hidden="true">▣</span>',iconSize:[30,30]}),keyboard:true,title:demoSite.name}).bindTooltip(demoSite.name).on('click',()=>{pickSite(true);select(null)}).addTo(group);
 },[feed,query,severity,selected]);
 function focus(a:Alert){pickSite(false);select(a);if(a.geometry){const bounds=L.geoJSON(a as unknown as GeoJSON.Feature).getBounds();map.current?.fitBounds(bounds,{maxZoom:8,padding:[35,35]})}}
 return <section className="operations"><div className="ops-heading"><div><span className="eyebrow">NATIONAL OPERATIONS</span><h1>U.S. Disaster Map</h1><p>Official weather alerts. One view across the United States.</p></div><button className="secondary" onClick={refresh} disabled={loading}>{loading?'Updating…':'Refresh alerts'}</button></div>
 <div className="ops-status"><span className="dot"/>{feed?.status==='available'?'NWS feed connected':feed?.status==='stale-cache'?'Cached feed · updates unavailable':'Connecting to NWS'}<span>Retrieved {feed?.retrievedAt?new Date(feed.retrievedAt).toLocaleString():'—'}</span><span>Refreshes every 5 minutes · cache up to 5 minutes</span></div>
 {error&&<p role="alert">{error}</p>}{feed?.status==='unavailable'&&<p role="alert">Official alerts are unavailable. Try refreshing. Missing data does not indicate safe conditions.</p>}
 <div className="ops-toolbar"><input aria-label="Search alerts" placeholder="Search hazards, states, or counties…" value={query} onChange={e=>search(e.target.value)}/><select aria-label="Filter severity" value={severity} onChange={e=>filter(e.target.value)}>{['All','Extreme','Severe','Moderate','Minor','Unknown'].map(s=><option key={s}>{s}</option>)}</select><button onClick={()=>{pickSite(true);select(null);map.current?.setView([demoSite.lat,demoSite.lon],16)}}>Richardson demo</button><button onClick={()=>map.current?.setView([39,-98],4)}>Continental U.S.</button><button onClick={()=>map.current?.setView([64,-152],4)}>Alaska</button><button onClick={()=>map.current?.setView([20.5,-157],6)}>Hawaii</button></div>
 {siteSelected&&<RichardsonDemo hazard={demoHazard} onHazard={setDemoHazard}/>}
 <div className="ops-grid"><div className="ops-map" ref={host} aria-label="Interactive United States alert map"/><aside className="ops-alerts"><h2>Active alerts <span>{visible.length}</span></h2><p>{visible.filter(a=>!a.geometry).length} alerts have no polygon and appear in this list only.</p>{!loading&&feed?.status==='available'&&!visible.length&&<p>No matching alerts returned.</p>}{visible.map(a=><button key={a.id} className={'ops-alert '+(selected?.id===a.id?'chosen':'')} onClick={()=>focus(a)}><b>{a.properties.event}</b><small>{a.properties.areaDesc}</small><em>{a.properties.severity} · {new Date(a.properties.expires).toLocaleString()}</em></button>)}</aside></div>
 {selected?<article className="ops-detail"><div><span className="eyebrow">OFFICIAL ALERT</span><h2>{selected.properties.headline||selected.properties.event}</h2><p>{selected.properties.areaDesc}</p><small>Issued {new Date(selected.properties.sent).toLocaleString()} · Expires {new Date(selected.properties.expires).toLocaleString()}</small><p className="ops-copy">{selected.properties.description}</p></div><div><h3>Recommended response</h3><p className="ops-copy">{selected.properties.instruction||'No instructions supplied in this alert. Follow updates from local authorities.'}</p><a href="https://www.weather.gov/" target="_blank" rel="noreferrer">National Weather Service ↗</a><h3>Property & community evidence</h3><p>Property records, equipment condition, verified assistance requests, and loss estimates are not connected to this alert yet.</p></div></article>:<div className="ops-detail"><div><h2>Follow the signal.</h2><p>Select the Richardson structure node or an alert to inspect the affected area, timing, and official instructions.</p></div><div><h3>Coverage</h3><p>Nationwide NWS weather alerts, including Alaska and Hawaii. The cyan node represents the Richardson test building. Shaded polygons represent alert areas. Weather alert areas indicate a threat, not confirmed damage.</p></div></div>}
 <div className="ops-metrics">{[['Hazard evidence','Official NWS alerts'],['Property exposure','Awaiting property records'],['Assistance needs','Awaiting verified requests'],['Failure forecasts','Validation required']].map(([k,v])=><div key={k}><small>{k}</small><strong>{v}</strong></div>)}</div></section>
}
