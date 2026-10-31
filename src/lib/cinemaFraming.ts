import {bezelGeometry,type Cubic} from './bezelGeometry';
const crt=bezelGeometry(1000,600).curves.map(c=>c.map(p=>({x:p.x/1000,y:p.y/600}))) as Cubic[];
const corners=[[0,0],[1,0],[1,0],[1,1],[1,1],[0,1],[0,1],[0,0],[0,0]];
export function cinemaOutline(progress:number,width=1,height=1) {
 const curves=crt.map((c,i)=>c.map((point,j)=>{
  const a=corners[i],b=corners[i+1],t=j/3;
  return {x:(point.x+(a[0]+(b[0]-a[0])*t-point.x)*progress)*width,y:(point.y+(a[1]+(b[1]-a[1])*t-point.y)*progress)*height};
 }));
 return `M ${curves[0][0].x} ${curves[0][0].y} `+curves.map(c=>`C ${c.slice(1).map(p=>`${p.x} ${p.y}`).join(' ')}`).join(' ')+' Z';
}
/** Constant native aspect, continuously blending card cover into viewport contain. */
export function cinemaVideoBox(width:number,height:number,aspect:number,progress:number) {
 const ratio=aspect>0&&Number.isFinite(aspect)?aspect:16/9;
 const cover=Math.max(width/ratio,height),contain=Math.min(width/ratio,height);
 const h=cover+(contain-cover)*progress,w=h*ratio;
 return {width:w,height:h,left:(width-w)/2,top:(height-h)/2};
}
