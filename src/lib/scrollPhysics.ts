export const WHEEL_SENSITIVITY = 0.0025;
export const SCROLL_LERP = 0.1;
export const SNAP_IDLE_MS = 120;
export const PROJECT_TRAVEL = 400;
export const modulo = (value:number,count:number)=>((value%count)+count)%count;
/** Finite reel: advancing through projects moves the upper preview down. */
export function reelOffset(index:number,scroll:number,_count:number){return scroll-index;}
export type ReelFrame={currentScroll:number;targetScroll:number;scrollVelocity:number;index:number;deltaMs:number;settled:boolean;virtualScrollY:number;storyScrollY:number;progress:number;handoff:number};
type Listener=(frame:ReelFrame)=>void;
export class ScrollPhysics {
 private dragging=false;private dirty=true;private lastInput=-Infinity;private lastFrame:number|null=null;private listeners=new Set<Listener>();
 currentScroll=0;targetScroll=0;private storyHeight=0;private viewportHeight=800;
 private frame:ReelFrame={currentScroll:0,targetScroll:0,scrollVelocity:0,index:0,deltaMs:1000/60,settled:true,virtualScrollY:0,storyScrollY:0,progress:0,handoff:0};
 constructor(readonly count:number){}
 get reelEnd(){return (this.count-1)*PROJECT_TRAVEL;}
 get maxScroll(){return this.reelEnd+this.storyHeight;}
 invalidate=()=>{this.dirty=true;};read=()=>this.frame;
 subscribe=(listener:Listener)=>{this.listeners.add(listener);listener(this.frame);return()=>{this.listeners.delete(listener);};};
 configureStory(height:number,viewport:number){this.storyHeight=Math.max(0,height);this.viewportHeight=Math.max(1,viewport);this.targetScroll=Math.min(this.targetScroll,this.maxScroll);this.currentScroll=Math.min(this.currentScroll,this.maxScroll);this.invalidate();}
 scrollTo(y:number,now=performance.now()){this.targetScroll=Math.max(0,Math.min(this.maxScroll,y));this.lastInput=now;this.invalidate();}
 add(delta:number,now:number){this.scrollTo(this.targetScroll+delta*PROJECT_TRAVEL,now);}
 wheel(delta:number,now:number){this.scrollTo(this.targetScroll+delta,now);}
 beginDrag(){this.dragging=true;}
 endDrag(velocity:number,now:number){this.dragging=false;this.scrollTo(this.targetScroll-velocity*7.2,now);if(this.targetScroll<=this.reelEnd)this.targetScroll=Math.round(this.targetScroll/PROJECT_TRAVEL)*PROJECT_TRAVEL;}
 select(index:number,now:number){this.scrollTo(Math.max(0,Math.min(this.count-1,index))*PROJECT_TRAVEL,now);}
 step(direction:number,now:number){this.scrollTo(this.targetScroll+(this.targetScroll<=this.reelEnd?PROJECT_TRAVEL:this.viewportHeight*.7)*direction,now);}
 advance(now:number,reducedMotion=false,frameDt?:number){
  const dt=frameDt??(this.lastFrame!==null?Math.min((now-this.lastFrame)/1000,.05):1/60);
  if(!this.dragging&&now-this.lastInput>=SNAP_IDLE_MS&&this.targetScroll<=this.reelEnd)this.targetScroll=Math.round(this.targetScroll/PROJECT_TRAVEL)*PROJECT_TRAVEL;
  const before=this.currentScroll;
  this.currentScroll=reducedMotion?this.targetScroll:this.currentScroll+(this.targetScroll-this.currentScroll)*(1-Math.exp(-10*dt));
  if(Math.abs(this.targetScroll-this.currentScroll)<.01)this.currentScroll=this.targetScroll;
  const reel=Math.min(this.count-1,this.currentScroll/PROJECT_TRAVEL),target=Math.min(this.count-1,this.targetScroll/PROJECT_TRAVEL);
  const storyScrollY=Math.max(0,this.currentScroll-this.reelEnd);
  this.frame={currentScroll:reel,targetScroll:target,scrollVelocity:reducedMotion?0:target-reel,index:Math.max(0,Math.min(this.count-1,Math.round(reel))),deltaMs:dt*1000,settled:this.currentScroll===this.targetScroll,virtualScrollY:this.currentScroll,storyScrollY,progress:this.maxScroll?this.currentScroll/this.maxScroll:0,handoff:Math.min(1,storyScrollY/this.viewportHeight)};
  this.lastFrame=now;if(this.dirty||before!==this.currentScroll){this.dirty=false;this.listeners.forEach(listener=>listener(this.frame));}return this.frame;
 }
}
