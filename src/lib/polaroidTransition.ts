export const PHOTO_SWAP_MS=40;
export const PHOTO_HIDE_MS=2150;
export const PHOTO_END_MS=2200;
export const ABOUT_REVEAL_MS=900;
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export function bezier(x:number,x1:number,y1:number,x2:number,y2:number){if(x<=0)return 0;if(x>=1)return 1;let lo=0,hi=1;for(let i=0;i<14;i++){const t=(lo+hi)/2,v=3*(1-t)*(1-t)*t*x1+3*(1-t)*t*t*x2+t*t*t;if(v<x)lo=t;else hi=t;}const t=(lo+hi)/2;return 3*(1-t)*(1-t)*t*y1+3*(1-t)*t*t*y2+t*t*t;}
export function photoFrame(elapsed:number){
 const hold=clamp((elapsed-40)/810),p=clamp((elapsed-850)/1300),t=p*1.3;
 const travel=bezier(p,.55,.05,.25,1),ramp=clamp(t/.5),swingRamp=ramp*ramp*(3-2*ramp);
 return {flash:elapsed<40?clamp(elapsed/40):1-bezier(clamp((elapsed-40)/260),.16,1,.3,1),
 x:85*travel,z:60,
 swing:elapsed<850?-1.5*Math.sin(hold*Math.PI*3)*(1-hold):26*swingRamp+Math.sin(t*9)*Math.exp(-t*2)*5,
 yaw:-18*swingRamp,pitch:elapsed<850?8*Math.sin(hold*Math.PI*2)*Math.exp(-hold*3):10*swingRamp,
 blur:6*(1-hold),brightness:.6+.4*hold,wire:elapsed<40?0:1-clamp((elapsed-1900)/250)};
}
