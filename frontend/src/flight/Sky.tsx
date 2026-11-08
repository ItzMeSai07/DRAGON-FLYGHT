import {useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as T from 'three';

const fragment=`
varying vec3 dir;
uniform float storm,clock;
float hash(vec2 p){return fract(sin(dot(p,vec2(123.4,345.6)))*43758.5);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){float s=0.,v=.53;for(int i=0;i<5;i++){s+=v*noise(p);p=mat2(1.65,-1.15,1.15,1.65)*p+1.8;v*=.5;}return s;}
void main(){
 vec3 d=normalize(dir);float h=max(0.,d.y);
 vec3 sun=normalize(vec3(-.58,.22,-.8));float glow=max(0.,dot(d,sun));
 vec3 sky=mix(vec3(.84,.7,.51),vec3(.13,.37,.53),sqrt(h));
 sky+=vec3(.7,.35,.11)*pow(glow,10.)+vec3(1.6,1.1,.58)*smoothstep(.9993,.9999,glow);
 vec2 uv=d.xz/(max(.05,h)+.14)*1.1+vec2(clock*.013,0.);
 float f=fbm(uv),cloud=smoothstep(.49-storm*.13,.71-storm*.11,f);
 vec3 light=mix(vec3(.92,.84,.73),vec3(.31,.38,.42),smoothstep(.48,.73,f));
 sky=mix(sky,light,cloud);sky=mix(sky,sky*vec3(.50,.55,.62),storm*.8);
 gl_FragColor=vec4(sky,1.);
 #include <colorspace_fragment>
}`;
export function Sky({phase,paused}:{phase:number;paused:boolean}){
 const mesh=useRef<T.Mesh>(null!),material=useRef<T.ShaderMaterial>(null!),initial=useMemo(()=>({storm:{value:0},clock:{value:0}}),[]);
 useFrame(({camera},dt)=>{mesh.current.position.copy(camera.position);const u=material.current.uniforms;u.storm.value=T.MathUtils.damp(u.storm.value,phase===2?1:phase===1?.45:0,1,Math.min(dt,.05));if(!paused||phase===0)u.clock.value+=Math.min(dt,.05);});
 return <mesh ref={mesh} renderOrder={-100} frustumCulled={false}><sphereGeometry args={[940,32,16]}/><shaderMaterial side={T.BackSide} depthWrite={false} ref={material} uniforms={initial} vertexShader={'varying vec3 dir;void main(){dir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}'} fragmentShader={fragment}/></mesh>;
}
