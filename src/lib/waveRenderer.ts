import type {ContourPulse} from './contourPulse';
export type RibbonDynamics={mouseX:number;mouseY:number;energy:number;palette?:readonly string[];dt?:number};
const rgb=(hex:string)=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
/** Soft volumetric field, without contour lines, mesh strokes, or per-frame blur filters. */
export function createWaveRenderer(canvas:HTMLCanvasElement){
 const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)return null;
 const fog=document.createElement('canvas'),f=fog.getContext('2d')!;
 let width=1,height=1,colors=[[139,92,246],[16,185,129],[0,184,201]];
 const resize=(w:number,h:number)=>{width=Math.max(1,Math.round(w));height=Math.max(1,Math.round(h));canvas.width=width;canvas.height=height;fog.width=Math.ceil(width/4);fog.height=Math.ceil(height/4);};
 const draw=(time:number,_pulses:ContourPulse[]=[],light=false,d:RibbonDynamics={mouseX:width/2,mouseY:height/2,energy:0})=>{
  const dt=d.dt??1/60,k=1-Math.exp(-2.4*dt),palette=d.palette??['#8B5CF6','#10B981','#00B8C9'];
  colors=colors.map((c,i)=>c.map((v,j)=>v+(rgb(palette[i])[j]-v)*k));
  ctx.globalCompositeOperation='source-over';ctx.fillStyle=light?'#f6f6f4':'#08080b';ctx.fillRect(0,0,width,height);
  f.clearRect(0,0,fog.width,fog.height);f.globalCompositeOperation='screen';
  const energy=Math.min(3,d.energy),mx=d.mouseX/width-.5,my=d.mouseY/height-.5;
  for(let i=0;i<3;i++){
   const a=time*.23+i*Math.PI*2/3,x=(.5+Math.cos(a)*.22+mx*.045)*fog.width,y=(.5+Math.sin(a*.83+i)*.22+my*.055)*fog.height;
   f.save();f.translate(x,y);f.rotate(a*.32+energy*.12*(i-1));f.scale(fog.width*(.38+energy*.025),fog.height*(.46+Math.sin(a)*.06));
   const g=f.createRadialGradient(-.15,.05,0,0,0,1),c=colors[i].map(Math.round).join(',');
   g.addColorStop(0,`rgba(${c},.36)`);g.addColorStop(.38,`rgba(${c},.23)`);g.addColorStop(.72,`rgba(${c},.07)`);g.addColorStop(1,`rgba(${c},0)`);f.fillStyle=g;f.fillRect(-1,-1,2,2);f.restore();
  }
  // Cursor parts the fog, then adds a broad luminous torch in screen space.
  f.globalCompositeOperation='destination-out';const well=f.createRadialGradient(d.mouseX/4,d.mouseY/4,0,d.mouseX/4,d.mouseY/4,105);well.addColorStop(0,'rgba(0,0,0,.32)');well.addColorStop(1,'transparent');f.fillStyle=well;f.fillRect(0,0,fog.width,fog.height);
  ctx.globalCompositeOperation=light?'multiply':'screen';ctx.globalAlpha=light?.3:.8;ctx.drawImage(fog,0,0,width,height);ctx.globalAlpha=1;
  const torch=ctx.createRadialGradient(d.mouseX,d.mouseY,0,d.mouseX,d.mouseY,550);torch.addColorStop(0,light?'rgba(90,75,65,.025)':'rgba(243,239,230,.055)');torch.addColorStop(1,'transparent');ctx.fillStyle=torch;ctx.fillRect(0,0,width,height);ctx.globalCompositeOperation='source-over';
  // Swiss guides and cursor-revealed precision dot field.
  const ink=light?'17,17,19':'243,239,230';ctx.strokeStyle=`rgba(${ink},.055)`;ctx.lineWidth=1;ctx.beginPath();
  for(const x of [.04,.315,.675,.96]){ctx.moveTo(x*width,0);ctx.lineTo(x*width,height);}for(const y of [.1,.5,.9]){ctx.moveTo(0,y*height);ctx.lineTo(width,y*height);}ctx.stroke();
  for(let x=Math.max(0,Math.floor((d.mouseX-420)/36)*36);x<Math.min(width,d.mouseX+420);x+=36)for(let y=Math.max(0,Math.floor((d.mouseY-420)/36)*36);y<Math.min(height,d.mouseY+420);y+=36){const q=Math.max(0,1-Math.hypot(x-d.mouseX,y-d.mouseY)/420);if(q){ctx.fillStyle=`rgba(${ink},${q*.08})`;ctx.fillRect(x,y,1.5,1.5);}}
  for(const u of [.04,.315,.675,.96])for(const v of [.1,.5,.9]){const x=u*width,y=v*height,q=Math.max(0,1-Math.hypot(x-d.mouseX,y-d.mouseY)/180);ctx.save();ctx.translate(x,y);ctx.rotate(q*Math.PI/2);ctx.strokeStyle=q>.01?`rgba(255,77,28,${.16+q*.84})`:`rgba(${ink},.16)`;ctx.beginPath();ctx.moveTo(-4.5,0);ctx.lineTo(4.5,0);ctx.moveTo(0,-4.5);ctx.lineTo(0,4.5);ctx.stroke();ctx.restore();}
  ctx.fillStyle=`rgba(${ink},.32)`;ctx.font='9px monospace';ctx.fillText('[ 12.97° N, 77.59° E ]',width*.04+12,height*.1-12);ctx.textAlign='right';ctx.fillText('[ REEL // 60FPS ]',width*.96-12,height*.9+20);ctx.textAlign='left';
  const vignette=ctx.createRadialGradient(width/2,height/2,Math.min(width,height)*.25,width/2,height/2,Math.hypot(width,height)*.55);vignette.addColorStop(0,'transparent');vignette.addColorStop(1,light?'rgba(30,25,20,.08)':'rgba(0,0,0,.65)');ctx.fillStyle=vignette;ctx.fillRect(0,0,width,height);
 };
 return {resize,draw,dispose:()=>{fog.width=1;}};
}
