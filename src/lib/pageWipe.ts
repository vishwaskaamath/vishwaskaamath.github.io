export const WIPE_SWAP_MS = 680;
export const WIPE_REVEAL_MS = 780;
export const WIPE_END_MS = 1380;
export const ABOUT_REVEAL_MS = 920;
export const clamp = (v:number) => Math.max(0, Math.min(1, v));
export const easeOutCubic = (v:number) => 1 - Math.pow(1 - clamp(v), 3);
export const wipeTiles = Array.from({length:160}, (_,i) => {
 const col=i%16, row=Math.floor(i/16);
 return {col,row,threshold:(col/15)*0.42+((9-row)/9)*0.48+((col*3)%4)*0.035};
});
// Include the final tile's growth interval so the hold is completely opaque.
export const WAVE_EXTENT = Math.max(...wipeTiles.map(t=>t.threshold)) + 0.14;
export function tileFill(elapsed:number, threshold:number) {
 const uncover=elapsed>=WIPE_REVEAL_MS;
 const phaseTime=uncover?elapsed-WIPE_REVEAL_MS:elapsed;
 const waveProgress=clamp(phaseTime/600)*WAVE_EXTENT;
 const eased=easeOutCubic((waveProgress-threshold)/0.14);
 return uncover?1-eased:eased;
}
