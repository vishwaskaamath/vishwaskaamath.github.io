export const WHEEL_SENSITIVITY = 0.0025;

export const SNAP_IDLE_MS = 120;
export const PROJECT_TRAVEL = 400;
export const modulo = (value:number,count:number)=>((value%count)+count)%count;
/** Infinite reel: advancing through projects moves the upper preview down. */
export function reelOffset(index:number,scroll:number,_count:number){return modulo(scroll-index+_count/2,_count)-_count/2;}
export type ReelFrame={currentScroll:number;targetScroll:number;scrollVelocity:number;index:number;deltaMs:number;settled:boolean;virtualScrollY:number;storyScrollY:number;progress:number;handoff:number};
type Listener=(frame:ReelFrame)=>void;
export class ScrollPhysics {
 private dragging=false;private dirty=true;private lastInput=-Infinity;private lastFrame:number|null=null;private listeners=new Set<Listener>();
 view:'work'|'about'='work';locked=false;onBoundary:(()=>void)|null=null;overshoot=0;private savedReel=0;
 currentScroll=0;targetScroll=0;private springVelocity=0;private storyHeight=0;private viewportHeight=800;
 private frame:ReelFrame={currentScroll:0,targetScroll:0,scrollVelocity:0,index:0,deltaMs:1000/60,settled:true,virtualScrollY:0,storyScrollY:0,progress:0,handoff:0};
 constructor(readonly count:number){}
 get reelEnd(){return (this.count-1)*PROJECT_TRAVEL;}
 get maxScroll(){return this.view==='work'?this.reelEnd:Math.max(0,this.storyHeight-this.viewportHeight);}
 invalidate=()=>{this.dirty=true;};read=()=>this.frame;
 subscribe=(listener:Listener)=>{this.listeners.add(listener);listener(this.frame);return()=>{this.listeners.delete(listener);};};
 setView(view:'work'|'about'){if(view===this.view)return;if(this.view==='work')this.savedReel=this.currentScroll;this.view=view;this.currentScroll=this.targetScroll=view==='work'?this.savedReel:0;this.overshoot=0;this.springVelocity=0;this.dragging=false;this.lastInput=performance.now();this.invalidate();this.advance(performance.now(),true);}
 configureStory(height:number,viewport:number){this.storyHeight=Math.max(0,height);this.viewportHeight=Math.max(1,viewport);if(this.view==='about'){this.targetScroll=Math.min(this.targetScroll,this.maxScroll);this.currentScroll=Math.min(this.currentScroll,this.maxScroll);}this.invalidate();}
 scrollTo(y:number,now=performance.now()){if(this.locked)return;this.targetScroll=this.view==='work'?y:Math.max(0,Math.min(this.maxScroll,y));this.lastInput=now;this.invalidate();}
 add(delta:number,now:number){this.wheel(delta*PROJECT_TRAVEL,now);}
 wheel(delta:number,now:number){if(this.locked)return;if(this.view==='about'){const end=this.maxScroll;if((delta<0&&this.currentScroll<=1)||(delta>0&&this.currentScroll>=end-1)){this.overshoot+=Math.abs(delta);this.invalidate();if(this.overshoot>=120)this.onBoundary?.();return;}this.overshoot=0;}this.scrollTo(this.targetScroll+delta,now);}
 beginDrag(){this.dragging=true;}
 endDrag(velocity:number,now:number){this.dragging=false;this.scrollTo(this.targetScroll-velocity*7.2,now);if(this.view==='work')this.targetScroll=Math.round(this.targetScroll/PROJECT_TRAVEL)*PROJECT_TRAVEL;}
 select(index:number,now:number){const turn=Math.round((this.currentScroll/PROJECT_TRAVEL-index)/this.count);this.scrollTo((index+turn*this.count)*PROJECT_TRAVEL,now);}
 step(direction:number,now:number){this.wheel((this.view==='work'?PROJECT_TRAVEL:this.viewportHeight*.7)*direction,now);}
 advance(now:number,reducedMotion=false,frameDt?:number){
  const dt=frameDt??(this.lastFrame!==null?Math.min((now-this.lastFrame)/1000,.05):1/60);
  if(!this.dragging&&now-this.lastInput>=SNAP_IDLE_MS&&this.view==='work')this.targetScroll=Math.round(this.targetScroll/PROJECT_TRAVEL)*PROJECT_TRAVEL;
  const before=this.currentScroll;
  if(reducedMotion){this.currentScroll=this.targetScroll;this.springVelocity=0;}
  else if(this.view==='work'){
   // Small integration steps keep the same weighted spring stable at every refresh rate.
   const steps=Math.max(1,Math.ceil(dt/(1/240))),step=dt/steps;
   for(let i=0;i<steps;i++){
    const force=(this.targetScroll-this.currentScroll)*120;
    this.springVelocity+=(force-this.springVelocity*18)*step;
    this.currentScroll+=this.springVelocity*step;
   }
   if(Math.abs(this.targetScroll-this.currentScroll)<.01&&Math.abs(this.springVelocity)<.05){this.currentScroll=this.targetScroll;this.springVelocity=0;}
  }else{
   this.currentScroll+=(this.targetScroll-this.currentScroll)*(1-Math.exp(-10*dt));
   if(Math.abs(this.targetScroll-this.currentScroll)<.01)this.currentScroll=this.targetScroll;
  }
  const reel=(this.view==='work'?this.currentScroll:this.savedReel)/PROJECT_TRAVEL,target=(this.view==='work'?this.targetScroll:this.savedReel)/PROJECT_TRAVEL;
  const storyScrollY=this.view==='about'?this.viewportHeight+this.currentScroll:0;
  this.frame={currentScroll:reel,targetScroll:target,scrollVelocity:reducedMotion?0:this.view==='work'?this.springVelocity/PROJECT_TRAVEL:target-reel,index:modulo(Math.round(reel),this.count),deltaMs:dt*1000,settled:this.currentScroll===this.targetScroll,virtualScrollY:this.currentScroll,storyScrollY,progress:this.view==='about'?(this.maxScroll?this.currentScroll/this.maxScroll:0):modulo(reel,this.count)/this.count,handoff:this.view==='about'?1:0};
  this.lastFrame=now;if(this.dirty||before!==this.currentScroll){this.dirty=false;this.listeners.forEach(listener=>listener(this.frame));}return this.frame;
 }
}
