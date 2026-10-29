export const WIPE_SWAP_MS = 620;
export const WIPE_UNCOVER_MS = 720;
export const WIPE_END_MS = 1350;
export const ABOUT_REVEAL_MS = 880;
export const tileDelay = (col: number, row: number) =>
  ((col + (9 - row)) / 24 * 0.86 + (((col * 7 + row * 13) % 5) / 5) * 0.14) * 480;
export const wipeTiles = Array.from({length:160}, (_,i) => ({col:i%16,row:Math.floor(i/16),delay:tileDelay(i%16,Math.floor(i/16))}));
export const tileCovered = (elapsed:number,delay:number) => elapsed >= delay && elapsed < WIPE_UNCOVER_MS + delay;
