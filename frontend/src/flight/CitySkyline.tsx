import {useLayoutEffect,useMemo,useRef} from 'react';
import * as T from 'three';
import {random} from './District';
export const cityBuildings=(()=>{const r=random(792);const buildings:{x:number;z:number;width:number;height:number}[]=[];
 for(let row=-6;row<=6;row++)for(let col=-6;col<=6;col++){
 const x=col*48,z=row*48;
 if(Math.abs(x)<65&&Math.abs(z)<65)continue;
 buildings.push({x,z,width:22+r()*9,height:22+r()*68+(row<0?30:0)});
 }return buildings;
})();
export function CitySkyline(){
 const mesh=useRef<T.InstancedMesh>(null!);
 const parts=useMemo(()=>{const r=random(36),parts:{pos:number[];scale:number[];color:string}[]=[];
 const box=(pos:number[],scale:number[],color:string)=>parts.push({pos,scale,color});
 for(const b of cityBuildings){box([b.x,b.height/2,b.z],[b.width,b.height,b.width],['#263945','#3b4650','#4c565b'][Math.floor(r()*3)]);box([b.x,b.height+.8,b.z],[b.width+1,1.6,b.width+1],'#182832');
 for(let y=4;y<b.height-2;y+=5)for(let x=-b.width/2+3;x<b.width/2;x+=5){const color=r()>.6?'#eac28c':'#426773';box([b.x+x,y,b.z+b.width/2+.05],[2.2,2.8,.1],color);box([b.x+b.width/2+.05,y,b.z+x],[.1,2.8,2.2],color)}
 box([b.x,.15,b.z],[b.width+5,.3,b.width+5],'#79858a');
 }return parts},[]);
 useLayoutEffect(()=>{const o=new T.Object3D();parts.forEach((p,i)=>{o.position.fromArray(p.pos);o.scale.fromArray(p.scale);o.updateMatrix();mesh.current.setMatrixAt(i,o.matrix);mesh.current.setColorAt(i,new T.Color(p.color))});mesh.current.instanceMatrix.needsUpdate=true},[parts]);
 return <><instancedMesh ref={mesh} args={[undefined,undefined,parts.length]} frustumCulled={false} receiveShadow><boxGeometry/><meshStandardMaterial roughness={.6} metalness={.2}/></instancedMesh>{[-312,-264,-216,-168,-120,-72,72,120,168,216,264,312].map(z=><mesh key={z} rotation={[-Math.PI/2,0,0]} position={[0,.02,z]} receiveShadow><planeGeometry args={[680,13]}/><meshStandardMaterial color="#26323a"/></mesh>)}</>
}
