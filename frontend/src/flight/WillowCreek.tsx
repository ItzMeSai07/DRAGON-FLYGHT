import {useEffect,useLayoutEffect,useMemo,useRef} from 'react';
import * as T from 'three';
import {random} from './District';

function sign(text:string,small:string,bg:string){
 const c=document.createElement('canvas');c.width=768;c.height=180;const ctx=c.getContext('2d')!;
 ctx.fillStyle=bg;ctx.fillRect(0,0,768,180);ctx.strokeStyle='#e2d3af';ctx.lineWidth=3;ctx.strokeRect(7,7,754,166);
 ctx.fillStyle='#f4ebd8';ctx.textAlign='center';ctx.font='bold 69px Georgia';ctx.fillText(text,384,96,720);
 ctx.font='24px system-ui';ctx.fillText(small,384,144);const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;return map;
}
function Plaque({name,sub,bg,at,width}:{name:string;sub:string;bg:string;at:[number,number,number];width:number}){
 const tex=useMemo(()=>sign(name,sub,bg),[name,sub,bg]);useEffect(()=>()=>tex.dispose(),[tex]);
 return <mesh position={at}><planeGeometry args={[width,width*.234]}/><meshBasicMaterial map={tex} side={T.DoubleSide}/></mesh>;
}
export function WillowCreek(){
 const blocks=useRef<T.InstancedMesh>(null!);
 const pieces=useMemo(()=>{
  const items:{p:number[];s:number[];c:string}[]=[],r=random(531);
  const box=(x:number,y:number,z:number,w:number,h:number,d:number,c:string)=>items.push({p:[x,y,z],s:[w,h,d],c});
  // Three rows of occupied streets complete the skyline beyond the playable block.
  for(const z of [-69,-96,-125])for(let i=-6;i<=6;i++){
    const x=i*20+r()*2,w=14+r()*4,h=7+Math.floor(r()*4)*4,d=13;
    box(x,h/2,z,w,h,d,['#ad967d','#937269','#8c897c','#b49a77'][(i+6)%4]);
    box(x,h+.3,z,w+.8,.65,d+.8,'#5f6260');box(x,h+1,z,w*.26,1.5,3,'#797b72');
    for(let level=2;level<h;level+=3.5)for(let col=-1;col<=1;col++)box(x+col*w*.31,level,z+6.6,w*.22,1.9,.16,r()>.57?'#d3b287':'#4e696c');
    box(x,.24,z+8,w+1,.45,2.8,'#a9a599');
  }
  for(let x=-42;x<=42;x+=14){
    box(x,3.1,5,.16,6.2,.16,'#424b4b');box(x+.65,6.18,5,1.4,.15,.18,'#424b4b');box(x+1.3,6.08,5,.58,.12,.4,'#ead6aa');
  }
  for(let i=0;i<24;i++){
    const x=-43+(i%12)*7.3,z=i<12?-31:30;
    if(i%3===1)continue;
    box(x,.65,z,3.5,.84,1.55,['#727d79','#875f52','#c7b99b','#515a65'][i%4]);box(x+.2,1.25,z,1.8,.52,1.33,'#47585b');
    for(const side of [-1,1])for(const axle of [-1,1])box(x+axle*1.1,.38,z+side*.71,.5,.6,.24,'#2c3030');
  }
  return items;
 },[]);
 useLayoutEffect(()=>{const o=new T.Object3D();pieces.forEach((b,i)=>{o.position.fromArray(b.p);o.scale.fromArray(b.s);o.updateMatrix();blocks.current.setMatrixAt(i,o.matrix);blocks.current.setColorAt(i,new T.Color(b.c));});blocks.current.instanceMatrix.needsUpdate=true;},[pieces]);
 return <><instancedMesh ref={blocks} args={[undefined,undefined,pieces.length]} frustumCulled={false} castShadow receiveShadow><boxGeometry/><meshStandardMaterial roughness={.79}/></instancedMesh>
 <group position={[-49,0,-46]}>{[-3,3].flatMap(x=>[-3,3].map(z=><mesh key={x+','+z} position={[x,12,z]}><cylinderGeometry args={[.16,.32,24,8]}/><meshStandardMaterial color="#697b77"/></mesh>))}
 <mesh position={[0,24,0]}><sphereGeometry args={[6,32,16]}/><meshStandardMaterial color="#a0b6aa" metalness={.25} roughness={.65}/></mesh></group>
 <Plaque at={[-49,24,-40]} width={8} name="WILLOW CREEK" sub="WATER DISTRICT" bg="#48645b"/>
 <Plaque at={[8,6.85,19.22]} width={12} name="PATEL’S" sub="PHARMACY  •  SINCE 1984" bg="#214943"/>
 <Plaque at={[17,5.4,-4.14]} width={13} name="MARKET STREET" sub="PROVISIONS" bg="#70483b"/>
 </>;
}
