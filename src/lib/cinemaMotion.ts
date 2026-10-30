import {bezelGeometry,type Cubic} from './bezelGeometry';
export const clamp01=(v:number)=>Math.max(0,Math.min(1,v));
export function cinemaEase(p:number,closing=false){
 if(p<=0)return 0;if(p>=1)return 1;
 const x1=closing?.22:.16,x2=closing?.36:.3;let lo=0,hi=1;
 for(let i=0;i<14;i++){const t=(lo+hi)/2,u=1-t;if(3*u*u*t*x1+3*u*t*t*x2+t*t*t<p)lo=t;else hi=t;}
 return 1-Math.pow(1-(lo+hi)/2,3);
}
export const closeMix=(elapsed:number)=>({backdrop:1-clamp01(elapsed/500),handoff:clamp01((elapsed-470)/80)});
const crt=bezelGeometry(1000,600).curves.map(c=>c.map(p=>({x:p.x/1000,y:p.y/600}))) as Cubic[];
export function cinemaClip(progress:number,width:number,height:number){
 const x=Math.min(.5,18/Math.max(1,width)),y=Math.min(.5,18/Math.max(1,height)),k=.55228475;
 const p=(x:number,y:number)=>({x,y});
 const flat:Cubic[]=[
 [p(x,0),p(.32,0),p(.68,0),p(1-x,0)],
 [p(1-x,0),p(1-x+x*k,0),p(1,y-y*k),p(1,y)],
 [p(1,y),p(1,.32),p(1,.68),p(1,1-y)],
 [p(1,1-y),p(1,1-y+y*k),p(1-x+x*k,1),p(1-x,1)],
 [p(1-x,1),p(.68,1),p(.32,1),p(x,1)],
 [p(x,1),p(x-x*k,1),p(0,1-y+y*k),p(0,1-y)],
 [p(0,1-y),p(0,.68),p(0,.32),p(0,y)],
 [p(0,y),p(0,y-y*k),p(x-x*k,0),p(x,0)]];
 const curves=crt.map((c,i)=>c.map((v,j)=>({x:v.x+(flat[i][j].x-v.x)*progress,y:v.y+(flat[i][j].y-v.y)*progress})));
 return `M ${curves[0][0].x} ${curves[0][0].y} `+curves.map(c=>`C ${c.slice(1).map(v=>`${v.x} ${v.y}`).join(' ')}`).join(' ')+' Z';
}
