import type { BackgroundRipple } from './backgroundRipples';
/** Static ribbon meshes: only time uniforms change per frame; DPR remains 1. */
export function createWaveRenderer(canvas: HTMLCanvasElement) {
  const gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,powerPreference:'high-performance'});
  if(!gl)return null;
  const vertex=`
precision highp float;
attribute vec4 aPoint;
uniform vec2 uSize;
uniform float uTime;
uniform float uSilk;
varying float vEdge;
varying float vAlpha;
varying float vGlow;
uniform vec4 uRipple[5];
uniform vec2 uRippleMeta[5];
vec2 rippleAt(vec2 p){
 vGlow=0.0;
 for(int i=0;i<5;i++){
  vec4 r=uRipple[i];vec2 meta=uRippleMeta[i];
  if(r.w<0.5)continue;
  vec2 d=p-r.xy;
  if(abs(d.x)>=r.z+meta.x||abs(d.y)>=r.z+meta.x)continue;
  float dist=max(length(d),1.0),norm=(dist-r.z)/meta.x;
  if(abs(norm)<1.0){
   float envelope=pow(cos(norm*1.570796327),2.0);
   float offset=sin(norm*7.853981634)*envelope*r.w;
   p+=vec2(d.x/dist*offset*.45,d.y/dist*offset*.85+offset*.35);
   if(envelope>.3)vGlow=max(vGlow,envelope*meta.y);
  }
 }
 return p;
}

float heightAt(float x,float row){
 if(uSilk<0.5) return row+sin(x*.0025+row*.006+uTime*.4)*55.0+cos(x*.006-row*.004+uTime*.25)*28.0+sin((x+row)*.004+uTime*.3)*18.0;
 float phase=row*.065;
 return uSize.y*.5+sin(x*.0022+uTime*.35)*110.0-(x-uSize.x*.5)*.12
 +sin(x*.0045-uTime*.5+phase)*95.0*sin(x*.0018+phase*.5)+cos(x*.008+uTime*.3-phase*1.2)*35.0;
}
void main(){
 float x=aPoint.x,y=heightAt(x,aPoint.y);
 float slope=heightAt(x+1.0,aPoint.y)-y;
 vec2 normal=normalize(vec2(-slope,1.0));
 float halfWidth=mix(1.75,.35,uSilk);
 vec2 p=rippleAt(vec2(x,y))+normal*aPoint.z*(halfWidth+1.0);
 gl_Position=vec4(p/uSize*vec2(2.0,-2.0)+vec2(-1.0,1.0),0,1);
 vEdge=aPoint.z*(halfWidth+1.0);
 vAlpha=mix(.35+(cos(x*.006-aPoint.y*.004+uTime*.25)+1.0)*.25,.028,uSilk);
}`;
  const fragment=`precision highp float;
uniform float uSilk;varying float vEdge;varying float vAlpha;varying float vGlow;
void main(){float halfWidth=mix(1.75,.35,uSilk);float cover=1.0-smoothstep(max(0.0,halfWidth-.5),halfWidth+.5,abs(vEdge));vec3 base=mix(vec3(19.0/255.0),vec3(190.0,200.0,215.0)/255.0,uSilk);gl_FragColor=vec4(mix(base,vec3(210.0,220.0,235.0)/255.0,.14*vGlow),min(1.0,vAlpha+.14*vGlow)*cover);}`;
  const shaders:WebGLShader[]=[];
  const compile=(type:number,source:string)=>{const s=gl.createShader(type)!;shaders.push(s);gl.shaderSource(s,source);gl.compileShader(s);return s;};
  const program=gl.createProgram()!,buffer=gl.createBuffer()!;
  gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
  const dispose=()=>{gl.deleteBuffer(buffer);gl.deleteProgram(program);shaders.forEach(s=>gl.deleteShader(s));};
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)){console.warn('Wave shader unavailable:', gl.getProgramInfoLog(program), ...shaders.map(s=>gl.getShaderInfoLog(s)));dispose();return null;}
  gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  const attr=gl.getAttribLocation(program,'aPoint');gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,4,gl.FLOAT,false,0,0);
  const size=gl.getUniformLocation(program,'uSize'),time=gl.getUniformLocation(program,'uTime'),silk=gl.getUniformLocation(program,'uSilk');
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  const rippleUniform=gl.getUniformLocation(program,'uRipple[0]'),metaUniform=gl.getUniformLocation(program,'uRippleMeta[0]');
  const rippleData=new Float32Array(20),metaData=new Float32Array(10);
  let ridges=0,total=0;
  const resize=(width:number,height:number)=>{
    canvas.width=width;canvas.height=height;gl.viewport(0,0,width,height);gl.uniform2f(size,width,height);
    const vertices:number[]=[];
    const line=(row:number)=>{for(let x=0;x<width;x+=28){const end=Math.min(width,x+28);for(const [px,side] of [[x,-1],[end,-1],[x,1],[x,1],[end,-1],[end,1]])vertices.push(px,row,side,0);}};
    for(let row=-108;row<=height+108;row+=12)line(row);
    ridges=vertices.length/4;
    for(let i=0;i<75;i++)line(i);
    total=vertices.length/4;gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
  };
  const draw=(elapsed:number,ripples:BackgroundRipple[]=[])=>{
    rippleData.fill(0);metaData.fill(0);
    ripples.slice(0,5).forEach((r,i)=>{rippleData.set([r.x,r.y,r.radius,r.strength],i*4);metaData.set([r.bandWidth,r.alpha],i*2);});
    gl.uniform4fv(rippleUniform,rippleData);gl.uniform2fv(metaUniform,metaData);
    gl.clearColor(6/255,6/255,6/255,1);gl.clear(gl.COLOR_BUFFER_BIT);gl.uniform1f(time,elapsed);gl.uniform1f(silk,0);
    // Four contiguous ridge batches and one translucent filament batch.
    const group=Math.floor(ridges/24)*6;
    for(let i=0;i<4;i++){const start=i*group;gl.drawArrays(gl.TRIANGLES,start,i===3?ridges-start:group);}
    gl.uniform1f(silk,1);gl.drawArrays(gl.TRIANGLES,ridges,total-ridges);
  };
  return {resize,draw,dispose};
}
