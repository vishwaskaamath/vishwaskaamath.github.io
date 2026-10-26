export type TrailPoint = { x: number; y: number; age: number };
const mix = (a: TrailPoint, b: TrailPoint, t: number): TrailPoint => ({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,age:a.age+(b.age-a.age)*t});
/** Centripetal Catmull–Rom: interpolate each recorded segment without spring drift.
 * Local spline segments avoid cusps; intentional crossings in the input remain. */
export function spline(points: TrailPoint[]): TrailPoint[] {
  if (points.length < 2) return points;
  const result: TrailPoint[] = [];
  const knot = (a: TrailPoint, b: TrailPoint) => Math.max(0.001, Math.sqrt(Math.hypot(a.x-b.x,a.y-b.y)));
  for(let i=0;i<points.length-1;i++) {
    const p1=points[i],p2=points[i+1];
    if(Math.hypot(p2.x-p1.x,p2.y-p1.y)<0.001) continue;
    const p0=points[i-1]??{...p1,x:2*p1.x-p2.x,y:2*p1.y-p2.y};
    const p3=points[i+2]??{...p2,x:2*p2.x-p1.x,y:2*p2.y-p1.y};
    const t0=0,t1=knot(p0,p1),t2=t1+knot(p1,p2),t3=t2+knot(p2,p3);
    for(let j=0;j<4;j++) {
      const u=j/4,t=t1+(t2-t1)*u;
      const a1=mix(p0,p1,(t-t0)/(t1-t0)),a2=mix(p1,p2,(t-t1)/(t2-t1)),a3=mix(p2,p3,(t-t2)/(t3-t2));
      const b1=mix(a1,a2,(t-t0)/(t2-t0)),b2=mix(a2,a3,(t-t1)/(t3-t1));
      const p=mix(b1,b2,(t-t1)/(t2-t1));p.age=p1.age+(p2.age-p1.age)*u;result.push(p);
    }
  }
  result.push(points[points.length-1]);return result;
}
export function recordPoint(points: TrailPoint[], x: number, y: number) {
  const last=points[points.length-1];
  if(!last||Math.hypot(x-last.x,y-last.y)>=3) {
    points.push({x,y,age:0});if(points.length>32) points.shift();
  }
}
export function drawLightTrail(ctx: CanvasRenderingContext2D, points: TrailPoint[], tip?: {x:number;y:number}) {
  const curve=spline(points);
  ctx.globalCompositeOperation='lighter';ctx.lineCap='round';ctx.lineJoin='round';
  // Batch subsegments into narrow age bands; a uniform ring needs just 3 strokes.
  const bands = new Map<number, Path2D>();
  let previousBand = -1;
  for(let i=1;i<curve.length;i++) {
    const a=curve[i-1],b=curve[i];
    const band=Math.min(15,Math.floor(Math.max(0,(a.age+b.age)/2)*16));
    let path=bands.get(band);if(!path){path=new Path2D();bands.set(band,path);}
    if(band !== previousBand) path.moveTo(a.x,a.y);
    path.lineTo(b.x,b.y); previousBand = band;
  }
  for(const [multiplier,alpha] of [[4,0.08],[2,0.28],[1,1]]) {
    for(const [band,path] of bands) {
      const age=band/15;
      ctx.lineWidth=(5-4.9*age)*multiplier;
      ctx.strokeStyle=`rgba(255,255,255,${alpha*(1-age)})`;
      ctx.stroke(path);
    }
    if(tip) {ctx.fillStyle=`rgba(255,255,255,${alpha})`;ctx.beginPath();ctx.arc(tip.x,tip.y,2.5*multiplier,0,Math.PI*2);ctx.fill();}
  }
  ctx.globalCompositeOperation='source-over';
}
