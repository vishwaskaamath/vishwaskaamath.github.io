export const PHOTO_SWAP_MS=35;
export const PHOTO_END_MS=900;
export const ABOUT_REVEAL_MS=120;
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
// Solve the requested cubic-bezier(.16,1,.3,1) against elapsed time.
export function flashEase(x:number){let lo=0,hi=1;for(let i=0;i<12;i++){const t=(lo+hi)/2,v=3*(1-t)*(1-t)*t*.16+3*(1-t)*t*t*.3+t*t*t;if(v<x)lo=t;else hi=t;}const t=(lo+hi)/2;return 1-Math.pow(1-t,3);}
export function photoFrame(elapsed:number){
 const p=clamp((elapsed-35)/865),travel=Math.pow(p,1.55);
 return {flash:elapsed<35?clamp(elapsed/35):elapsed>=260?0:1-flashEase(clamp((elapsed-35)/225)),
 x:50+68*travel,y:22-18*travel,scale:.38-.24*travel,z:-400*travel,
 swing:-24*(1-Math.exp(-p*7))+Math.sin(p*30)*p*1.4,
 yaw:-18*Math.min(1,p*8),wire:elapsed<35?0:1-clamp((elapsed-650)/250)};
}
