import type {ContourPulse} from './contourPulse';
export type RibbonDynamics={mouseX:number;mouseY:number;energy:number;palette?:readonly string[];dt?:number;velocity?:number;label?:string;storyProgress?:number;ribbonAlpha?:number;story?:boolean};
const rgb=(hex:string)=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
/** Soft volumetric field, without contour lines, mesh strokes, or per-frame blur filters. */
export function createWaveRenderer(canvas:HTMLCanvasElement){
 const ctx=canvas.getContext('2d',{alpha:false,desynchronized:true});if(!ctx)return null;
 const fog=document.createElement('canvas'),f=fog.getContext('2d')!;
 let width=1,height=1,colors=[[139,92,246],[16,185,129],[0,184,201]];
 const watermark=document.createElement('canvas'),wc=watermark.getContext('2d')!;let watermarkKey='';
 const angles=new Map<number,number>();
 const motes=Array.from({length:65},(_,i)=>({x:(i*.618033)%1,y:(i*.41421)%1,z:.2+(i%17)/20,r:.8+(i%10)*.2}));
 let flow=0,flowSpeed=.12,lastTime=0,ribbonMouseX=0,ribbonMouseY=0,cursorReady=false;
 const pulsePositions=[0,.25,.5,.75];
 const resize=(w:number,h:number)=>{width=Math.max(1,Math.round(w));height=Math.max(1,Math.round(h));canvas.width=width;canvas.height=height;fog.width=Math.ceil(width/4);fog.height=Math.ceil(height/4);};
 const draw=(time:number,_pulses:ContourPulse[]=[],light=false,d:RibbonDynamics={mouseX:width/2,mouseY:height/2,energy:0})=>{
  const dt=d.dt??1/60,k=1-Math.exp(-2.4*dt),palette=d.palette??['#8B5CF6','#10B981','#00B8C9'];
  colors=colors.map((c,i)=>c.map((v,j)=>v+(rgb(palette[i])[j]-v)*k));
  ctx.globalCompositeOperation='source-over';ctx.fillStyle=light?'#F3EFE6':'#09090b';ctx.fillRect(0,0,width,height);
  f.clearRect(0,0,fog.width,fog.height);f.globalCompositeOperation='screen';
  flowSpeed+=(.12+Math.min(1,Math.abs(d.velocity??0))*.08-flowSpeed)*(1-Math.exp(-2*dt));flow+=dt*flowSpeed;
  const energy=Math.min(3,d.energy),mx=d.mouseX/width-.5,my=d.mouseY/height-.5;
  for(let i=0;i<2;i++){
   const a=time*.23+i*Math.PI*2/3,x=(.5+Math.cos(a)*.22+mx*.045)*fog.width,y=(.5+Math.sin(a*2+i)*.22+my*.055)*fog.height;
   f.save();f.translate(x,y);f.rotate(a*.32+energy*.12*(i-1));f.scale(fog.width*(.38+energy*.025),fog.height*(.46+Math.sin(a)*.06));
   const g=f.createRadialGradient(-.15,.05,0,0,0,1),c=colors[i].map(Math.round).join(',');
   g.addColorStop(0,`rgba(${c},.36)`);g.addColorStop(.38,`rgba(${c},.23)`);g.addColorStop(.72,`rgba(${c},.07)`);g.addColorStop(1,`rgba(${c},0)`);f.fillStyle=g;f.fillRect(-1,-1,2,2);f.restore();
  }
  // Cursor parts the fog, then adds a broad luminous torch in screen space.
  f.globalCompositeOperation='destination-out';const well=f.createRadialGradient(d.mouseX/4,d.mouseY/4,0,d.mouseX/4,d.mouseY/4,105);well.addColorStop(0,'rgba(0,0,0,.32)');well.addColorStop(1,'transparent');f.fillStyle=well;f.fillRect(0,0,fog.width,fog.height);
  ctx.globalCompositeOperation=light?'multiply':'screen';ctx.globalAlpha=light?.25:.55;ctx.drawImage(fog,0,0,width,height);ctx.globalAlpha=1;
  const torch=ctx.createRadialGradient(d.mouseX,d.mouseY,0,d.mouseX,d.mouseY,550);torch.addColorStop(0,light?'rgba(90,75,65,.025)':'rgba(243,239,230,.055)');torch.addColorStop(1,'transparent');ctx.fillStyle=torch;ctx.fillRect(0,0,width,height);ctx.globalCompositeOperation='source-over';
  const movingTime=Math.max(0,time-lastTime);lastTime=time;
  const velocity=d.velocity??0,ink=light?'17,17,19':'243,239,230';
  if(!d.story){const key=`${width}:${height}:${ink}:${d.label}`;if(key!==watermarkKey){watermarkKey=key;watermark.width=width*2;watermark.height=Math.ceil(width*.32);wc.font=`${width*.28}px "Bebas Neue",sans-serif`;wc.lineWidth=1;wc.strokeStyle=`rgba(${ink},.028)`;wc.strokeText(d.label??'01 // MOTION',0,width*.28);}ctx.drawImage(watermark,-d.mouseX*.04+Math.sin(time*.08)*35,height*.34+Math.sin(time*.12)*12-width*.28);}
  for(let col=0;col<22;col++)for(let row=0;row<12;row++){
   const x=(col+.5)*width/22,y=(row+.5)*height/12,id=col*12+row,target=Math.atan2(d.mouseY-y,d.mouseX-x)+velocity*.4,old=angles.get(id)??target;
   const angle=old+Math.atan2(Math.sin(target-old),Math.cos(target-old))*(1-Math.exp(-6*dt));angles.set(id,angle);
   const q=Math.max(0,1-Math.hypot(x-d.mouseX,y-d.mouseY)/240, .35*(1-Math.min(1,Math.abs(y-height*.5)/100))),len=6+q*5;
   ctx.strokeStyle=q>.02?`rgba(255,77,28,${.08+q*.3})`:`rgba(${ink},.08)`;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-Math.cos(angle)*len/2,y-Math.sin(angle)*len/2);ctx.lineTo(x+Math.cos(angle)*len/2,y+Math.sin(angle)*len/2);ctx.stroke();
  }
  motes.forEach((m,i)=>{m.y=(m.y-movingTime*(.009+velocity*.05)*m.z+2)%1;const x=m.x*width+Math.sin(time*.4+i)*14-d.mouseX*.03*m.z,y=m.y*height-d.mouseY*.012*m.z;ctx.fillStyle=i%3?`rgba(255,77,28,${.08+m.z*.24})`:`rgba(${ink},${.08+m.z*.2})`;ctx.beginPath();ctx.ellipse(x,y,m.r,m.r+Math.min(18,Math.abs(velocity)*3*m.z),0,0,Math.PI*2);ctx.fill();});
  // A dedicated, time-corrected 0.12 cursor lerp keeps the bend continuous.
  if(!cursorReady){ribbonMouseX=d.mouseX;ribbonMouseY=d.mouseY;cursorReady=true;}
  const cursorLerp=1-Math.pow(.88,dt*60);
  ribbonMouseX+=(d.mouseX-ribbonMouseX)*cursorLerp;ribbonMouseY+=(d.mouseY-ribbonMouseY)*cursorLerp;
  ctx.shadowBlur=0;ctx.lineCap='round';ctx.lineJoin='round';
  ctx.save();ctx.globalAlpha=d.ribbonAlpha??1;
  const paths:Path2D[]=[],groups=[new Path2D(),new Path2D(),new Path2D()];
  for(let i=0;i<12;i++){
   const points:{x:number;y:number}[]=[],v=i/11*2-1;
   for(let j=0;j<=36;j++){
    const x=j*width/36,u=x/width,twist=u*Math.PI*3.4-flow;
    const baseY=height*.5+(d.story?( .5-u)*height*.18:0)+Math.sin(u*Math.PI*2.1-flow)*Math.min(100,height*.11)+v*Math.sin(twist)*Math.min(70,height*.075);
    const dx=x-ribbonMouseX,dy=baseY-ribbonMouseY;
    const gaussianX=Math.exp(-(dx*dx)/(2*165*165)),gaussianY=Math.exp(-(dy*dy)/(2*140*140));
    const bend=dy/Math.sqrt(dy*dy+3600)*gaussianX*gaussianY*48;
    points.push({x,y:baseY+bend});
   }
   const path=new Path2D();path.moveTo(points[0].x,points[0].y);
   for(let j=1;j<points.length-1;j++){const p=points[j],next=points[j+1];path.quadraticCurveTo(p.x,p.y,(p.x+next.x)/2,(p.y+next.y)/2);}
   const tail=points[points.length-1];path.lineTo(tail.x,tail.y);paths.push(path);
   groups[Math.min(2,Math.floor(i/4))].addPath(path);
  }
  groups.forEach((path,i)=>{ctx.strokeStyle=['rgba(165,38,10,.4)','rgba(255,77,28,.55)','rgba(255,115,62,.65)'][i];ctx.lineWidth=.9+i*.15;ctx.stroke(path);});
  // The full cached spline is stroked: only a continuous gradient window moves.
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.shadowBlur=0;
  for(let i=0;i<4;i++){
   if(movingTime>0)pulsePositions[i]=(pulsePositions[i]+dt*(45+i*12)*(1+Math.min(1,Math.abs(velocity))*.25)/(width+210))%1;
   const pulseX=pulsePositions[i]*(width+210)-30;
   const g=ctx.createLinearGradient(pulseX-180,0,pulseX+30,0);
   g.addColorStop(0,'rgba(255,77,28,0)');g.addColorStop(.55,'rgba(255,110,60,.45)');g.addColorStop(.88,'rgba(255,225,200,.95)');g.addColorStop(1,'rgba(255,255,255,0)');
   ctx.strokeStyle=g;
   for(const [line,alpha] of [[4.5,.15],[1.6,.8]]){ctx.globalAlpha=alpha*(d.ribbonAlpha??1);ctx.lineWidth=line;ctx.stroke(paths[2+i*3]);}
  }
  ctx.restore();ctx.restore();
  const vignette=ctx.createRadialGradient(width/2,height/2,Math.min(width,height)*.25,width/2,height/2,Math.hypot(width,height)*.55);vignette.addColorStop(0,'transparent');vignette.addColorStop(1,light?'rgba(30,25,20,.08)':'rgba(0,0,0,.65)');ctx.fillStyle=vignette;ctx.fillRect(0,0,width,height);
 };
 return {resize,draw,dispose:()=>{fog.width=1;}};
}
