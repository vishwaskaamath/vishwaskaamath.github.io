export type RibbonPoint = Readonly<{x:number;y:number;time:number}>;
export type RibbonSample = {x:number;y:number;nx:number;ny:number;radius:number};
export const TRAIL_LIFETIME=180;
export function recordPoint(history:RibbonPoint[],x:number,y:number,time:number){
 const last=history[0];
 if(!last||Math.hypot(x-last.x,y-last.y)>=8)history.unshift({x,y,time});
}
export function expireHistory(history:RibbonPoint[],now:number){
 while(history.length&&now-history[history.length-1].time>TRAIL_LIFETIME)history.pop();
}
/** Midpoint quadratic spans with exact analytical tangents, including endpoint joins. */
export function buildSmoothRibbon(pts:readonly RibbonPoint[],now:number,maxAge=180):RibbonSample[]{
 if(pts.length<3)return [];
 const samples:RibbonSample[]=[],mids:RibbonPoint[]=[];
 for(let i=0;i<pts.length-1;i++)mids.push({x:(pts[i].x+pts[i+1].x)*.5,y:(pts[i].y+pts[i+1].y)*.5,time:(pts[i].time+pts[i+1].time)*.5});
 let nx=0,ny=1;
 const span=(m0:RibbonPoint,p1:RibbonPoint,m1:RibbonPoint,includeEnd=false)=>{
  for(let s=0;s<(includeEnd?15:14);s++){
   const t=s/14,inv=1-t;
   const x=inv*inv*m0.x+2*inv*t*p1.x+t*t*m1.x;
   const y=inv*inv*m0.y+2*inv*t*p1.y+t*t*m1.y;
   const time=inv*inv*m0.time+2*inv*t*p1.time+t*t*m1.time;
   let tx=inv*(p1.x-m0.x)+t*(m1.x-p1.x),ty=inv*(p1.y-m0.y)+t*(m1.y-p1.y);
   if(Math.hypot(tx,ty)<1e-8){tx=m1.x-m0.x;ty=m1.y-m0.y;}
   const length=Math.hypot(tx,ty);if(length>1e-8){nx=-ty/length;ny=tx/length;}
   const age=Math.min(1,Math.max(0,(now-time)/maxAge));
   samples.push({x,y,nx,ny,radius:3.2*(1-age)**1.6});
  }
 };
 // Connect the live tip to the first midpoint without a visible gap.
 span(pts[0],pts[0],mids[0]);
 for(let i=1;i<pts.length-1;i++)span(mids[i-1],pts[i],mids[i]);
 span(mids[mids.length-1],pts[pts.length-1],pts[pts.length-1],true);
 return samples;
}
export function drawRibbon(ctx:CanvasRenderingContext2D,samples:readonly RibbonSample[]){
 if(!samples.length)return;
 const head=samples[0];ctx.beginPath();
 ctx.moveTo(head.x+head.nx*head.radius,head.y+head.ny*head.radius);
 for(let i=1;i<samples.length;i++){const s=samples[i];ctx.lineTo(s.x+s.nx*s.radius,s.y+s.ny*s.radius);}
 for(let i=samples.length-1;i>=0;i--){const s=samples[i];ctx.lineTo(s.x-s.nx*s.radius,s.y-s.ny*s.radius);}
 const angle=Math.atan2(head.ny,head.nx);
 ctx.arc(head.x,head.y,head.radius,angle+Math.PI,angle);ctx.closePath();
 ctx.globalCompositeOperation='source-over';
 ctx.filter='blur(5px)';ctx.fillStyle='rgba(255,255,255,0.45)';ctx.fill();
 ctx.filter='none';ctx.fillStyle='#ffffff';ctx.fill();
}
