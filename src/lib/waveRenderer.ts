import type {ContourPulse} from './contourPulse';
export type RibbonDynamics={mouseX:number;mouseY:number;energy:number};
type Point={x:number;y:number};
/** One silk band, fourteen contours. No full-screen ridge mesh or WebGL fallback. */
export function createWaveRenderer(canvas:HTMLCanvasElement){
 const ctx=canvas.getContext('2d',{alpha:false,desynchronized:true});if(!ctx)return null;
 const backdrop=document.createElement('canvas'),shade=document.createElement('canvas'),torch=document.createElement('canvas');
 const bg=backdrop.getContext('2d')!,edge=shade.getContext('2d')!,lamp=torch.getContext('2d')!;
 let width=1,height=1,lastLight:boolean|null=null;
 function prepare(light:boolean){
  lastLight=light;backdrop.width=shade.width=width;backdrop.height=shade.height=height;
  bg.fillStyle=light?'#f6f6f4':'#09090b';bg.fillRect(0,0,width,height);
  bg.save();bg.translate(width*.5,height*.5);bg.scale(width*.45,height*.32);
  const warmth=bg.createRadialGradient(0,0,0,0,0,1);warmth.addColorStop(0,'rgba(255,77,28,0.08)');warmth.addColorStop(.75,'rgba(255,77,28,0)');bg.fillStyle=warmth;bg.fillRect(-1,-1,2,2);bg.restore();
  const vignette=edge.createRadialGradient(width*.5,height*.5,0,width*.5,height*.5,Math.hypot(width,height)*.5);
  vignette.addColorStop(0,'rgba(0,0,0,0)');vignette.addColorStop(.55,'rgba(0,0,0,0)');vignette.addColorStop(1,light?'rgba(65,48,35,.1)':'rgba(0,0,0,.65)');edge.fillStyle=vignette;edge.fillRect(0,0,width,height);
  torch.width=torch.height=700;const glow=lamp.createRadialGradient(350,350,0,350,350,350);glow.addColorStop(0,light?'rgba(55,45,35,.035)':'rgba(243,239,230,.045)');glow.addColorStop(.8,'rgba(243,239,230,0)');lamp.fillStyle=glow;lamp.fillRect(0,0,700,700);
 }
 const resize=(w:number,h:number)=>{width=Math.max(1,Math.round(w));height=Math.max(1,Math.round(h));canvas.width=width;canvas.height=height;lastLight=null;};
 // Midpoint quadratics prevent angular joins even when sampled economically.
 const trace=(path:Path2D,points:Point[],move=true)=>{if(move)path.moveTo(points[0].x,points[0].y);else path.lineTo(points[0].x,points[0].y);for(let i=1;i<points.length-1;i++)path.quadraticCurveTo(points[i].x,points[i].y,(points[i].x+points[i+1].x)/2,(points[i].y+points[i+1].y)/2);const p=points.at(-1)!;path.lineTo(p.x,p.y);};
 const draw=(time:number,pulses:ContourPulse[]=[],light=false,dynamics:RibbonDynamics={mouseX:width*.5,mouseY:height*.5,energy:0})=>{
  if(lastLight!==light)prepare(light);
  ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;ctx.drawImage(backdrop,0,0);ctx.drawImage(torch,dynamics.mouseX-350,dynamics.mouseY-350);
  const parallax=(dynamics.mouseY/height-.5)*22,energy=Math.min(3,Math.abs(dynamics.energy));
  const amplitude=Math.min(100,height*.11)*(1+energy*.12),halfWidth=Math.min(70,height*.075);
  const curves:Point[][]=[];const mesh=new Path2D();
  for(let i=0;i<14;i++){
   const v=i/13*2-1,points:Point[]=[];
   for(let x=-24;x<=width+24;x+=16){
    const u=x/width,twist=u*Math.PI*3.4-time*.52;
    const spine=height*.5+Math.sin(u*Math.PI*2.1+time*.37)*amplitude+Math.sin(u*Math.PI*3.8-time*.21)*amplitude*.25+parallax;
    const spread=Math.sin(twist)*halfWidth;
    // The entire ribbon rotates about its spine; contour count stays sparse at pinch points.
    points.push({x,y:spine+v*spread+Math.cos(twist)*Math.sin(v*Math.PI)*halfWidth*.19});
   }
   curves.push(points);trace(mesh,points);
  }
  const band=new Path2D();trace(band,curves[0]);trace(band,[...curves[13]].reverse(),false);band.closePath();ctx.fillStyle='rgba(255,77,28,.12)';ctx.fill(band);
  ctx.lineWidth=1;ctx.lineCap='round';ctx.lineJoin='round';
  curves.forEach((points,i)=>{
   const path=new Path2D();trace(path,points);
   const gradient=ctx.createLinearGradient(0,height*.38,width,height*.62);
   gradient.addColorStop(0,'rgba(165,38,10,.35)');gradient.addColorStop(.26,'rgba(255,77,28,.75)');gradient.addColorStop(.52,i>10?'rgba(255,140,95,.9)':'rgba(255,77,28,.55)');gradient.addColorStop(.72,'rgba(165,38,10,.35)');gradient.addColorStop(1,'rgba(255,77,28,.65)');ctx.strokeStyle=gradient;ctx.stroke(path);
  });
  ctx.globalCompositeOperation=light?'multiply':'lighter';
  for(const p of pulses){const inner=Math.max(0,p.radius-70),outer=p.radius+70,g=ctx.createRadialGradient(p.x,p.y,inner,p.x,p.y,outer);g.addColorStop(0,'rgba(255,140,95,0)');g.addColorStop(Math.max(.001,(p.radius-inner)/(outer-inner)),`rgba(255,140,95,${.16*p.alpha})`);g.addColorStop(1,'rgba(255,140,95,0)');ctx.strokeStyle=g;ctx.stroke(mesh);}
  ctx.globalCompositeOperation='source-over';ctx.drawImage(shade,0,0);

 };
 return {resize,draw,dispose:()=>{backdrop.width=shade.width=torch.width=1;}};
}
