import {useEffect,useRef,useState} from 'react';
export type MapBuilding={id:string;name:string;lat:number;lng:number;x:number;y:number;height:number;radius:number;residents:number|null;outline?:{lat:number;lng:number}[]};
export type MapDrone={id:number;pos:number[];battery:number;saved:number;status:string;path:number[][];plannedPath?:number[][];target:string|null};
export type MapFrame={minute:number;saved:number;reached:number;hazard:{zones:{x:number;y:number;radius:number;top:number;kind?:string}[];wind?:number[]};drones:MapDrone[]};
export type MapConfig={city:{name:string;origin:number[];longitude_m_per_degree?:number;map_zoom?:number;pilot_name?:string;assumptions:Record<string,number>};buildings:MapBuilding[];googleMapsKey:string;notice:string};
let mapsLoading:Promise<any>|undefined;
async function googleMaps(key:string){
 if((window as any).google?.maps?.Map)return (window as any).google.maps;
 if(!mapsLoading)mapsLoading=new Promise((resolve,reject)=>{
 const script=document.createElement('script');const w=window as any;
 const fail=()=>{mapsLoading=undefined;script.remove();reject(Error('Google Maps failed to load. Check key, API activation, billing, and referrer restrictions.'))};
 const timer=setTimeout(fail,20000);
 w.dragonflyMapsReady=()=>{clearTimeout(timer);resolve(w.google.maps)};
 script.src='https://maps.googleapis.com/maps/api/js?key='+encodeURIComponent(key)+'&loading=async&callback=dragonflyMapsReady';script.async=true;script.onerror=()=>{clearTimeout(timer);fail()};document.head.append(script);
 });
 return mapsLoading;
}
export function geographic(config:MapConfig,p:number[]){return {lat:config.city.origin[0]+p[1]/111000,lng:config.city.origin[1]+p[0]/(config.city.longitude_m_per_degree||84300)}}
export function HoustonMap({config,frame,baseline,occupancy,epicenter,onEpicenter,open,onClose}:{config:MapConfig;frame?:MapFrame;baseline?:MapFrame;occupancy:Record<string,number>;epicenter:number[];onEpicenter:(p:number[])=>void;open:boolean;onClose:()=>void}){
 const dialog=useRef<HTMLElement>(null);
 const host=useRef<HTMLDivElement>(null),map=useRef<any>(null),staticLayers=useRef<any[]>([]),dynamicLayers=useRef<any[]>([]),[ready,setReady]=useState(false),[error,setError]=useState('');
 useEffect(()=>{if(!config.googleMapsKey||!host.current)return;let cancelled=false,listener:any;
 googleMaps(config.googleMapsKey).then(g=>{if(cancelled)return;map.current=new g.Map(host.current,{center:{lat:29.76,lng:-95.37},zoom:10,mapTypeId:'roadmap',streetViewControl:false,mapTypeControl:true,fullscreenControl:false,styles:[{elementType:'geometry',stylers:[{color:'#152737'}]},{elementType:'labels.text.fill',stylers:[{color:'#92b6c9'}]},{elementType:'labels.text.stroke',stylers:[{color:'#152737'}]},{featureType:'water',elementType:'geometry',stylers:[{color:'#063c50'}]},{featureType:'road',elementType:'geometry',stylers:[{color:'#344855'}]}]});listener=map.current.addListener('click',(e:any)=>{const x=(e.latLng.lng()-config.city.origin[1])*(config.city.longitude_m_per_degree||84300),y=(e.latLng.lat()-config.city.origin[0])*111000;if(Math.max(Math.abs(x),Math.abs(y))<=550)onEpicenter([Math.round(x),Math.round(y)])});setReady(true)}).catch(e=>setError(String(e)));
 return()=>{cancelled=true;listener?.remove();setReady(false);map.current=null};
 },[config]);
 useEffect(()=>{if(!ready)return;const g=(window as any).google.maps;staticLayers.current.forEach(l=>l.setMap(null));const layers:any[]=[];
 const sw=geographic(config,[-650,-650]),ne=geographic(config,[650,650]);layers.push(new g.Rectangle({map:map.current,bounds:{south:sw.lat,west:sw.lng,north:ne.lat,east:ne.lng},fillOpacity:0,strokeColor:'#67ebf5',strokeWeight:2}));
 for(const b of config.buildings){const options={map:map.current,fillColor:'#69e0e6',fillOpacity:Math.min(.75,.12+(occupancy[b.id]||0)/450),strokeColor:'#4f8d9f',strokeWeight:1};const shape=b.outline?new g.Polygon({...options,paths:b.outline}):new g.Circle({...options,center:{lat:b.lat,lng:b.lng},radius:b.radius});const info=new g.InfoWindow();shape.addListener('click',()=>{const content=document.createElement('div');content.style.color='#132532';content.textContent=b.name+' · estimated occupancy '+(occupancy[b.id]?.toFixed(0)||'run simulation');info.setContent(content);info.setPosition({lat:b.lat,lng:b.lng});info.open(map.current)});layers.push(shape);layers.push({setMap:()=>info.close()})}
 staticLayers.current=layers;return()=>layers.forEach(l=>l.setMap(null))},[config,ready,occupancy]);
 useEffect(()=>{if(!ready)return;const g=(window as any).google.maps;dynamicLayers.current.forEach(l=>l.setMap(null));const layers:any[]=[];
 for(const z of frame?.hazard.zones||[])layers.push(new g.Circle({map:map.current,center:geographic(config,[z.x,z.y]),radius:z.radius,fillColor:'#ff725c',fillOpacity:.25,strokeColor:'#ff856c',strokeWeight:2}));
 layers.push(new g.Circle({map:map.current,center:geographic(config,epicenter),radius:15,fillColor:'#ff5577',fillOpacity:1,strokeWeight:1}));
 for(const [f,color] of [[baseline,'#efb85a'],[frame,'#65edf1']] as const)for(const d of f?.drones||[]){layers.push(new g.Polyline({map:map.current,path:(d.plannedPath||d.path).map(p=>geographic(config,p)),strokeColor:color,strokeWeight:3}));
 class DragonflyOverlay extends g.OverlayView{element=document.createElement('div');onAdd(){this.element.className='drone-map-icon';this.element.textContent='✧';this.element.style.color=color;this.element.title=`Drone ${d.id+1} · ${d.status}`;this.getPanes().overlayMouseTarget.appendChild(this.element)}draw(){const p=this.getProjection().fromLatLngToDivPixel(new g.LatLng(geographic(config,d.pos)));if(p)this.element.style.transform=`translate(${p.x}px,${p.y}px) translate(-50%,-50%)`}onRemove(){this.element.remove()}}
 const marker=new DragonflyOverlay();marker.setMap(map.current);layers.push(marker)}
 dynamicLayers.current=layers;return()=>layers.forEach(l=>l.setMap(null))},[ready,config,frame,baseline,epicenter]);
 useEffect(()=>{if(open&&ready){const g=(window as any).google.maps;g.event.trigger(map.current,'resize')}},[open,ready]);
 useEffect(()=>{
 if(!open||!dialog.current)return;
 const previous=document.activeElement as HTMLElement|null;
 dialog.current.querySelector<HTMLButtonElement>('button')?.focus();
 const trap=(event:KeyboardEvent)=>{
   if(event.key!=='Tab')return;
   const buttons=Array.from(dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')||[]);
   const first=buttons[0],last=buttons[buttons.length-1];
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}
   if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}
 };
 document.addEventListener('keydown',trap);
 return()=>{document.removeEventListener('keydown',trap);previous?.focus()};
 },[open]);
 const focus=()=>{map.current?.setCenter(geographic(config,frame?.drones[0]?.pos||[0,0]));map.current?.setZoom(16)};
 return <div className={'houston-map-overlay '+(open?'is-open':'')} aria-hidden={!open}><section ref={dialog} role={open?'dialog':undefined} aria-modal={open||undefined} aria-label="Houston mission map"><header><div><span className="eyebrow">HOUSTON, TEXAS · GOOGLE MAPS</span><h2>Mission map <small>M to close</small></h2></div><button onClick={onClose}>Close ×</button></header><div className="map-actions"><button disabled={!ready} onClick={()=>{map.current?.setCenter({lat:29.76,lng:-95.37});map.current?.setZoom(10)}}>Houston city view</button><button disabled={!ready} onClick={()=>{map.current?.setCenter(geographic(config,[0,0]));map.current?.setZoom(15)}}>Downtown pilot</button><button disabled={!ready||!frame} onClick={focus}>Locate active drone</button></div><div className="houston-google-host" ref={host}/>{!config.googleMapsKey&&<div className="map-key-message"><h3>Connect your Google Maps key</h3><p>Add GOOGLE_MAPS_API_KEY to the project .env and restart the backend. The tactical simulation remains playable.</p></div>}{error&&<p role="alert">{error}</p>}<footer>Minute {frame?.minute||0} · {frame?.drones.map(d=>`D${d.id+1}: ${d.status} · ${d.battery.toFixed(0)} Wh`).join(' / ')||'Awaiting mission'}<p>Full Houston map · cyan boundary marks the computed downtown pilot. Click within it to set the next scenario’s storm center.</p></footer></section></div>
}
