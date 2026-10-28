export type RibbonPoint = Readonly<{x:number;y:number;time:number}>;
export const TRAIL_LIFETIME=175;
export function recordPoint(history:RibbonPoint[],x:number,y:number,time:number){
 const last=history[0];
 if(!last||Math.hypot(x-last.x,y-last.y)>=1.5)history.unshift({x,y,time});
}
export function expireHistory(history:RibbonPoint[],now:number){
 while(history.length&&now-history[history.length-1].time>TRAIL_LIFETIME)history.pop();
}
/** Nonuniform, centripetal Catmull–Rom (alpha=.5), with reflected endpoints. */
export function sampleCatmullRom(points:readonly RibbonPoint[],subdivisions=8):RibbonPoint[]{
 const pts=points.filter((p,i)=>!i||Math.hypot(p.x-points[i-1].x,p.y-points[i-1].y)>1e-6);
 if(pts.length<2)return [...pts];
 const result:RibbonPoint[]=[];
 const mix=(a:RibbonPoint,b:RibbonPoint,ta:number,tb:number,t:number):RibbonPoint=>({x:((tb-t)*a.x+(t-ta)*b.x)/(tb-ta),y:((tb-t)*a.y+(t-ta)*b.y)/(tb-ta),time:0});
 const knot=(a:RibbonPoint,b:RibbonPoint)=>Math.sqrt(Math.hypot(b.x-a.x,b.y-a.y));
 for(let i=0;i<pts.length-1;i++){
  const p1=pts[i],p2=pts[i+1];
  const p0=pts[i-1]??{x:2*p1.x-p2.x,y:2*p1.y-p2.y,time:p1.time};
  const p3=pts[i+2]??{x:2*p2.x-p1.x,y:2*p2.y-p1.y,time:p2.time};
  const t0=0,t1=knot(p0,p1),t2=t1+knot(p1,p2),t3=t2+knot(p2,p3);
  for(let s=0;s<subdivisions;s++){
   const u=s/subdivisions,t=t1+(t2-t1)*u;
   const a=mix(p0,p1,t0,t1,t),b=mix(p1,p2,t1,t2,t),c=mix(p2,p3,t2,t3,t);
   const point=mix(mix(a,b,t0,t2,t),mix(b,c,t1,t3,t),t1,t2,t);
   result.push({x:point.x,y:point.y,time:p1.time+(p2.time-p1.time)*u});
  }
 }
 result.push(pts[pts.length-1]);return result;
}
/** Overlapping round capsules; no extruded normals or self-crossing polygon. */
export function drawCapsules(ctx:CanvasRenderingContext2D,pts:readonly RibbonPoint[],now:number,halo=false){
 ctx.globalCompositeOperation='lighten';ctx.lineCap='round';ctx.lineJoin='round';
 for(let i=0;i<pts.length-1;i++){
  const life=Math.max(0,Math.min(1,1-(now-pts[i].time)/TRAIL_LIFETIME));
  const width=5.2*life**1.5;if(width<.01)continue;
  ctx.lineWidth=width*(halo?2.2:1);ctx.strokeStyle=`rgba(255,255,255,${life**1.3*(halo?.45:1)})`;
  ctx.beginPath();ctx.moveTo(pts[i].x,pts[i].y);ctx.lineTo(pts[i+1].x,pts[i+1].y);ctx.stroke();
 }
}
