type Stamp = {canvas:HTMLCanvasElement;width:number;height:number;left:number;baseline:number};
let cachedKey='';
let cachedStamps:Record<string,Stamp>={};

/** Rasterize both destinations and palettes outside the animation ticker.
 * Retain only the current viewport's stamps across Work/About navigation. */
export function transitionTextStamps(width:number,height:number,dpr:number) {
 const fontSize=Math.round(Math.min(width*.36,height*.58));
 const font=`700 ${fontSize}px "Bebas Neue", sans-serif`;
 const key=`${fontSize}/${dpr}/${document.fonts.check(font)}`;
 if(key===cachedKey)return cachedStamps;
 const stamps:Record<string,Stamp>={};
 for(const word of ['ABOUT','WORK']) {
  const mask=document.createElement('canvas'),measure=mask.getContext('2d')!;
  measure.font=font;
  const metrics=measure.measureText(word),padding=4;
  const left=padding+Math.max(0,metrics.actualBoundingBoxLeft);
  const baseline=padding+metrics.actualBoundingBoxAscent;
  const w=Math.ceil(left+metrics.actualBoundingBoxRight+padding);
  const h=Math.ceil(baseline+metrics.actualBoundingBoxDescent+padding);
  mask.width=Math.ceil(w*dpr);mask.height=Math.ceil(h*dpr);
  const ink=mask.getContext('2d')!;
  ink.setTransform(dpr,0,0,dpr,0,0);ink.font=font;
  ink.textBaseline='alphabetic';ink.fillStyle='#111113';ink.fillText(word,left,baseline);
  stamps[`${word}/dark`]={canvas:mask,width:mask.width/dpr,height:mask.height/dpr,left,baseline};
  const inverted=document.createElement('canvas');inverted.width=mask.width;inverted.height=mask.height;
  const light=inverted.getContext('2d')!;light.drawImage(mask,0,0);
  light.globalCompositeOperation='source-in';light.fillStyle='#F3EFE6';light.fillRect(0,0,inverted.width,inverted.height);
  stamps[`${word}/light`]={...stamps[`${word}/dark`],canvas:inverted};
 }
 cachedKey=key;cachedStamps=stamps;return stamps;
}
