import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as T from 'three';

// The membrane and its network of veins share a texture on all four wings.
function membrane() {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.beginPath();
  ctx.moveTo(4, 89);
  ctx.bezierCurveTo(120, 34, 453, -10, 504, 31);
  ctx.bezierCurveTo(524, 72, 291, 132, 4, 94);
  ctx.closePath();
  const sheen = ctx.createLinearGradient(0, 0, 0, 128);
  sheen.addColorStop(0, '#ffffff'); sheen.addColorStop(.5, '#f6f5ffff'); sheen.addColorStop(1, '#bfccd2ef');
  ctx.fillStyle = sheen; ctx.fill(); ctx.strokeStyle = '#514e37'; ctx.lineWidth = 3; ctx.stroke();
  ctx.clip(); ctx.lineWidth = 1.4; ctx.strokeStyle = '#345853b0';
  for (let row = 0; row < 2; row++) {
    ctx.beginPath(); ctx.moveTo(4, 92);
    ctx.quadraticCurveTo(220, 62 + row * 7, 510, row * 15 - 12); ctx.stroke();
  }
  for (let x = 18; x < 518; x += 76) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x - 10, 52); ctx.lineTo(x + 7, 80); ctx.lineTo(x - 9, 128); ctx.stroke();
  }
  ctx.fillStyle = '#935f26'; ctx.fillRect(370, 16, 34, 7);
  const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace;
  return texture;
}

export function Dragonfly({opening}:{opening?:{current:number}}) {
  const texture = useMemo(membrane, []);
  const wings = useRef<(T.Group | null)[]>([]);
  useEffect(() => () => texture.dispose(), [texture]);
  useFrame(({clock}) => wings.current.forEach((wing, i) => {
    const perched=opening && (opening.current<43||opening.current>177);
    if (wing) wing.rotation.z = (i % 2 ? 1 : -1) * (perched ? .09+.025*Math.sin(clock.elapsedTime*2+i) : .13 + .42 * Math.sin(clock.elapsedTime * 103 + (i > 1 ? 1.5 : 0)));
  }));
  return <group>
    <mesh scale={[.32,.29,.97]}><sphereGeometry args={[1,20,16]}/><meshStandardMaterial color="#97efd0" roughness={.32} metalness={.65}/></mesh>
    {[-1,1].map(side => <mesh key={side} position={[side*.18,.09,-.89]} scale={[.23,.24,.2]}><icosahedronGeometry args={[1,2]}/><meshStandardMaterial color="#104f70" roughness={.24} metalness={.5}/></mesh>)}
    {Array.from({length:9}, (_,i) => <mesh key={i} position={[0,.06-i*.012,.86+i*.18]} rotation={[Math.PI/2,0,0]}>
      <cylinderGeometry args={[.16-i*.009,.14-i*.009,.23,12]}/><meshStandardMaterial color={i%2?'#104961':'#94efd2'} metalness={.55} roughness={.32}/>
    </mesh>)}
    {[0,1,2,3].map(i => {
      const side = i%2 ? 1 : -1, aft = i>1;
      return <group key={i} ref={n=>{wings.current[i]=n}} position={[side*.19,.18,aft?.16:-.21]}>
        <group rotation={[0,-side*(aft?.49:-.45),0]} scale={[side,1,1]}>
          {[0,.105].map((tilt,j)=><group key={j} rotation={[0,0,tilt]}>
            <mesh position={[1.35,0,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[2.7,aft?.91:.68]}/>
              <meshBasicMaterial map={texture} transparent opacity={j?.18:1} side={T.DoubleSide} depthWrite={false}/>
            </mesh></group>)}
        </group>
      </group>;
    })}
  </group>;
}
