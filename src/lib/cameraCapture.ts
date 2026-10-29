export const CAPTURE_SWAP_MS=560;
export const CAPTURE_END_MS=2450;
export const ABOUT_REVEAL_MS=1600;
export const stopMotionTime=(elapsed:number)=>Math.floor(Math.max(0,elapsed)/83)*83;
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
export function captureFrame(elapsed:number){
 const q=stopMotionTime(elapsed);
 const rise=clamp(q/500),lower=clamp((q-1200)/480),eject=clamp((q-620)/530),fall=clamp((q-1550)/(Math.floor(CAPTURE_END_MS/83)*83-1550));
 const gravity=fall*fall;
 const flutter=fall<.5?mix(2,-10,fall*2):mix(-10,15,(fall-.5)*2);
 const drift=fall<.5?mix(0,-24,fall*2):mix(-24,16,(fall-.5)*2);
 return {q,cameraY:q<1200?mix(100,12,1-Math.pow(1-rise,3)):mix(12,105,lower),
 pressed:q>=Math.floor(450/83)*83&&q<620,
 flash:elapsed<500?0:elapsed<600?1:elapsed>=820?0:1-Math.min(4,Math.floor((elapsed-600)/83)+1)/4,
 halo:elapsed>=500&&elapsed<620,
 photoVisible:elapsed>=620,
 x:fall>0?drift:0,y:fall>0?mix(-4,115,gravity):mix(4,-4,eject),
 z:mix(-60,120,eject),pitch:fall>0?16*fall:mix(80,0,eject),roll:fall>0?flutter:mix(-6,2,eject),scale:mix(.45,1,eject)};
}
