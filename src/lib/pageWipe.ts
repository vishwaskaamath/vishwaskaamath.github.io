export const WIPE_END_MS = 1380;
export const WIPE_COVER_MS = WIPE_END_MS * .42;
export const WIPE_SWAP_MS = 680;
export const WIPE_REVEAL_MS = WIPE_END_MS * .58;
export const ABOUT_REVEAL_MS = 920;
export const clamp = (v:number) => Math.max(0, Math.min(1, v));
export const easeOutCubic = (v:number) => 1 - Math.pow(1 - clamp(v), 3);
export const easeInOutCubic = (v:number) => {const t=clamp(v);return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;};
export const wipeTiles = Array.from({length:160}, (_,i) => {
 const col=i%16, row=Math.floor(i/16);
 return {col,row,threshold:(col/15)*0.42+((9-row)/9)*0.48+((col*3)%4)*0.035};
});
export const WAVE_EXTENT = Math.max(...wipeTiles.map(t=>t.threshold)) + 0.14;
export function tileFill(elapsed:number, threshold:number) {
 const totalProgress=clamp(elapsed/WIPE_END_MS);
 if(totalProgress<.58){
  const waveProgress=clamp(elapsed/WIPE_COVER_MS)*WAVE_EXTENT;
  return easeOutCubic((waveProgress-threshold)/.14);
 }
 const uncoverWave=(totalProgress-.58)/.42;
 return 1-easeInOutCubic((uncoverWave-threshold*.75)/.25);
}
export function labelPose(elapsed:number) {
 const p=clamp(elapsed/WIPE_END_MS);
 if(p<.42){const e=easeOutCubic(p/.42);return {offset:60*(1-e),alpha:e};}
 if(p<.58)return {offset:0,alpha:1};
 const e=easeInOutCubic((p-.58)/.42);return {offset:-90*e,alpha:1-e};
}
export const createWipeClock=(now:number)=>({elapsed:0,lastTime:now,buffer:0,swapped:false});
export function advanceWipeClock(clock:ReturnType<typeof createWipeClock>, now:number) {
 const dt=Math.min(Math.max(0,now-clock.lastTime),16.67);clock.lastTime=now;
 if(clock.buffer>0){clock.buffer--;return false;}
 const previous=clock.elapsed;
 clock.elapsed=Math.min(WIPE_END_MS,previous+dt);
 if(!clock.swapped&&clock.elapsed>=WIPE_SWAP_MS){
  clock.elapsed=WIPE_SWAP_MS;clock.swapped=true;clock.buffer=2;return true;
 }
 // Always paint the first uncover frame at precisely zero progress.
 if(previous<WIPE_REVEAL_MS&&clock.elapsed>=WIPE_REVEAL_MS)clock.elapsed=WIPE_REVEAL_MS;
 return false;
}
