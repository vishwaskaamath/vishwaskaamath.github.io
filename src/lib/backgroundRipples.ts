export type BackgroundRipple = {x:number;y:number;radius:number;maxRadius:number;strength:number;bandWidth:number;alpha:number};
export function spawnRipple(ripples:BackgroundRipple[],x:number,y:number,width:number,height:number,small=false) {
  ripples.push({x,y,radius:0,maxRadius:Math.hypot(width,height)*(small?.22:.85),strength:small?10:48,bandWidth:small?80:160,alpha:1});
  if(ripples.length>5)ripples.splice(0,ripples.length-5);
}
export function advanceRipples(ripples:BackgroundRipple[],dt:number) {
  const step=dt/(1000/60);
  for(let i=ripples.length-1;i>=0;i--){const r=ripples[i];
    r.radius+=18*(1-r.radius/r.maxRadius*.4)*step;
    r.strength*=Math.pow(.975,step);r.alpha=Math.max(0,1-r.radius/r.maxRadius);
    if(r.radius>=r.maxRadius||r.strength<.5)ripples.splice(i,1);
  }
}
export function displaceRipple(x:number,y:number,ripples:BackgroundRipple[]) {
  let highlight=0;
  for(const r of ripples){
    const dx=x-r.x,dy=y-r.y;
    if(Math.abs(dx)>=r.radius+r.bandWidth||Math.abs(dy)>=r.radius+r.bandWidth)continue;
    const dist=Math.hypot(dx,dy)||1,norm=(dist-r.radius)/r.bandWidth;
    if(Math.abs(norm)>=1)continue;
    const envelope=Math.cos(norm*Math.PI*.5)**2;
    const offset=Math.sin(norm*Math.PI*2.5)*envelope*r.strength;
    x+=dx/dist*offset*.45;y+=dy/dist*offset*.85+offset*.35;
    if(envelope>.3)highlight=Math.max(highlight,envelope*r.alpha);
  }
  return {x,y,highlight};
}
