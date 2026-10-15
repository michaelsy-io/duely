// Ported verbatim from the published Duely landing page (regal purple blob).
const NOISE = [
  'vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}',
  'vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}',
  'vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}',
  'vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}',
  'float snoise(vec3 v){const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);',
  'vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;',
  'vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;',
  'i=mod289(i);vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));',
  'float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);',
  'vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);',
  'vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;',
  'vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);',
  'vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;',
  'vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;',
  'return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}'
].join('\n');

const BLOB_SHADER = {
      vertexShader: NOISE + '\nuniform float uTime;uniform float uAmp;varying vec3 vN;varying vec3 vV;varying float vD;' +
    'void main(){float d=snoise(position*1.1+vec3(uTime*0.25,uTime*0.18,0.0));vD=d;' +
    'vec3 p=position+normal*d*uAmp;vec4 mv=modelViewMatrix*vec4(p,1.0);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
  fragmentShader: 'varying vec3 vN;varying vec3 vV;varying float vD;uniform float uTime;' +
    'void main(){vec3 lav=vec3(0.36,0.25,0.82);vec3 pink=vec3(0.55,0.30,0.78);vec3 sky=vec3(0.67,0.62,0.95);vec3 mint=vec3(0.22,0.16,0.55);' +
    'float t=vN.y*0.5+0.5;vec3 c=mix(lav,pink,smoothstep(0.1,0.9,vD*0.5+0.5));c=mix(c,sky,smoothstep(0.55,1.0,t)*0.6);c=mix(c,mint,smoothstep(0.75,1.0,-vN.x)*0.35);' +
    'float fr=pow(1.0-max(dot(vN,vV),0.0),2.5);vec3 L=normalize(vec3(-0.4,0.7,0.6));float sp=pow(max(dot(reflect(-L,vN),vV),0.0),28.0);' +
    'float dif=max(dot(vN,L),0.0)*0.35+0.75;c=c*dif+fr*vec3(0.85,0.80,1.0)*0.75+sp*0.6;gl_FragColor=vec4(c,1.0);}'
};

export { BLOB_SHADER };
