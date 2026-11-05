export const WHEEL_SENSITIVITY=.0025;
export const SNAP_IDLE_MS=120;
export const PROJECT_TRAVEL=400;
export const modulo=(v:number,n:number)=>((v%n)+n)%n;
export function reelOffset(i:number,s:number,n:number){return modulo(s-i+n/2,n)-n/2;}
export type ReelFrame={currentScroll:number;targetScroll:number;scrollVelocity:number;index:number;deltaMs:number;settled:boolean;virtualScrollY:number;storyScrollY:number;progress:number;handoff:number;heroProgress:number};
type Listener=(f:ReelFrame)=>void;
export class ScrollPhysics {
 view:'work'|'about'='work';locked=false;onBoundary:(()=>void)|null=null;overshoot=0;
 currentScroll=0;targetScroll=0;
 private reel=0;private reelTarget=0;private velocity=0;private height=800;private storyHeight=0;private last:number|null=null;private dirty=true;private reduced=false;
 private listeners=new Set<Listener>();
 private frame:ReelFrame={currentScroll:0,targetScroll:0,scrollVelocity:0,index:0,deltaMs:1000/60,settled:true,virtualScrollY:0,storyScrollY:0,progress:0,handoff:0,heroProgress:0};
 constructor(readonly count:number){}
 get pinDistance(){return this.reduced?0:this.height*1.4;}
 get reelEnd(){return (this.count-1)*PROJECT_TRAVEL;}
 get maxScroll(){return this.pinDistance+Math.max(this.height,this.storyHeight);}
 invalidate=()=>{this.dirty=true;};read=()=>this.frame;
 subscribe=(fn:Listener)=>{this.listeners.add(fn);fn(this.frame);return()=>{this.listeners.delete(fn);};};
 configureStory(height:number,viewport:number){const oldPin=this.pinDistance,oldHeight=this.height;this.storyHeight=height>0?height:this.storyHeight;this.height=Math.max(1,viewport);if(oldHeight!==this.height){const remap=(v:number)=>v<=oldPin&&oldPin>0?v/oldPin*this.pinDistance:this.pinDistance+(v-oldPin);this.currentScroll=remap(this.currentScroll);this.targetScroll=remap(this.targetScroll);}this.invalidate();}
 setView(view:'work'|'about'){this.currentScroll=this.targetScroll=view==='work'?0:this.pinDistance+this.height;this.invalidate();this.advance(performance.now(),this.reduced);}
 scrollTo(y:number,_now=performance.now()){if(this.locked)return;this.targetScroll=Math.max(0,Math.min(this.maxScroll,y));this.invalidate();}
 wheel(delta:number,now:number){this.scrollTo(this.targetScroll+delta,now);}
 add(delta:number,now:number){this.wheel(delta*PROJECT_TRAVEL,now);}
 beginDrag(){}
 endDrag(velocity:number,now:number){this.wheel(-velocity*7.2,now);}
 select(index:number,_now:number){const turn=Math.round((this.reel-index)/this.count);this.reelTarget=index+turn*this.count;this.invalidate();}
 step(direction:number,now:number){this.wheel(direction*this.height*.7,now);}
 advance(now:number,reducedMotion=false,frameDt?:number){
  const dt=frameDt??(this.last===null?1/60:Math.min(.05,(now-this.last)/1000));this.last=now;
  if(this.reduced!==reducedMotion){const old=this.pinDistance;this.reduced=reducedMotion;this.currentScroll=Math.max(0,this.currentScroll-old+this.pinDistance);this.targetScroll=Math.max(0,this.targetScroll-old+this.pinDistance);this.dirty=true;}
  const before=this.currentScroll,oldReel=this.reel;
  this.currentScroll=reducedMotion?this.targetScroll:this.currentScroll+(this.targetScroll-this.currentScroll)*(1-Math.exp(-5*dt));
  if(Math.abs(this.currentScroll-this.targetScroll)<.01)this.currentScroll=this.targetScroll;
  if(reducedMotion){this.reel=this.reelTarget;this.velocity=0;}else{const steps=Math.max(1,Math.ceil(dt*240)),step=dt/steps;for(let i=0;i<steps;i++){this.velocity+=((this.reelTarget-this.reel)*120-this.velocity*18)*step;this.reel+=this.velocity*step;}if(Math.abs(this.reel-this.reelTarget)<.0001&&Math.abs(this.velocity)<.0001){this.reel=this.reelTarget;this.velocity=0;}}
  const storyScrollY=Math.max(0,this.currentScroll-this.pinDistance),handoff=Math.min(1,storyScrollY/this.height);
  this.view=handoff>=1?'about':'work';
  this.frame={currentScroll:this.reel,targetScroll:this.reelTarget,scrollVelocity:this.velocity,index:modulo(Math.round(this.reel),this.count),deltaMs:dt*1000,settled:this.currentScroll===this.targetScroll&&this.reel===this.reelTarget,virtualScrollY:Math.max(0,storyScrollY-this.height),storyScrollY,progress:this.currentScroll/Math.max(1,this.maxScroll),handoff,heroProgress:reducedMotion?1:Math.min(1,this.currentScroll/this.pinDistance)};
  if(this.dirty||before!==this.currentScroll||oldReel!==this.reel){this.dirty=false;this.listeners.forEach(fn=>fn(this.frame));}return this.frame;
 }
}
