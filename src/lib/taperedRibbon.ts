export type RibbonPoint = { x: number; y: number };

/** Preserve both endpoints while cutting each interior corner twice. */
export function smoothRibbon(points: RibbonPoint[]) {
  let curve = points;
  for (let pass = 0; pass < 2; pass++) {
    const next: RibbonPoint[] = [{ ...curve[0] }];
    for (let i = 0; i < curve.length - 1; i++) {
      const a = curve[i], b = curve[i + 1];
      next.push({ x: .75*a.x+.25*b.x, y: .75*a.y+.25*b.y },
        { x: .25*a.x+.75*b.x, y: .25*a.y+.75*b.y });
    }
    next.push({ ...curve[curve.length - 1] });
    curve = next;
  }
  return curve;
}

export function ribbonEdges(points: RibbonPoint[]) {
  const left: RibbonPoint[] = [], right: RibbonPoint[] = [];
  let tx = 1, ty = 0, headAngle = 0;
  for (let i = 0; i < points.length; i++) {
    const before = points[Math.max(0, i - 1)], after = points[Math.min(points.length - 1, i + 1)];
    const dx = after.x-before.x, dy = after.y-before.y, length = Math.hypot(dx,dy);
    // Coincident nodes occur naturally as the resting ribbon collapses.
    if (length > .00001) { tx=dx/length; ty=dy/length; }
    if (!i) headAngle=Math.atan2(ty,tx);
    const radius=3.2*Math.pow(1-i/(points.length-1),1.65);
    left.push({x:points[i].x-ty*radius,y:points[i].y+tx*radius});
    right.push({x:points[i].x+ty*radius,y:points[i].y-tx*radius});
  }
  return {left,right,headAngle};
}

export function drawRibbon(ctx: CanvasRenderingContext2D, points: RibbonPoint[]) {
  const curve=smoothRibbon(points), {left,right,headAngle}=ribbonEdges(curve);
  const head=points[0], path=new Path2D();
  path.moveTo(left[0].x,left[0].y);
  for(let i=1;i<left.length;i++)path.lineTo(left[i].x,left[i].y);
  for(let i=right.length-1;i>=0;i--)path.lineTo(right[i].x,right[i].y);
  path.arc(head.x,head.y,3.2,headAngle-Math.PI/2,headAngle+Math.PI/2,true);
  path.closePath();
  ctx.filter='blur(6px)';ctx.fillStyle='rgba(255,255,255,0.45)';ctx.fill(path);
  ctx.filter='none';ctx.fillStyle='#ffffff';ctx.fill(path);
  ctx.beginPath();ctx.arc(head.x,head.y,3.2,0,Math.PI*2);ctx.fill();
}
