import manifest from '@/data/assetManifest.json';
import { requestTick } from './masterTicker';
export const actualProgressRef={current:0};
export const assetStatus={phase:'idle',loadedBytes:0,totalBytes:manifest.reduce((n,a)=>n+a.bytes,0),errors:[] as string[]};
const cache=new Map<string,string>(),loaded=new Map<string,number>();
let running:Promise<void>|null=null,ready=false,streaming=false;
export const assetUrl=(url:string)=>cache.get(url)??url;
export const cachedAsset=(url:string)=>cache.get(url);
export const assetsReady=()=>ready;
function progress(){assetStatus.loadedBytes=Array.from(loaded.values()).reduce((a,b)=>a+b,0);actualProgressRef.current=Math.min(94,assetStatus.loadedBytes/assetStatus.totalBytes*94);}
async function download(asset:typeof manifest[number]){
  if(cache.has(asset.url))return;
  const abort=new AbortController();let timeout:ReturnType<typeof setTimeout>;
  const reset=()=>{clearTimeout(timeout);timeout=setTimeout(()=>abort.abort(),30000);};reset();
  try{
    const response=await fetch(asset.url,{signal:abort.signal});if(!response.ok)throw Error(`${response.status}`);
    const chunks:Uint8Array<ArrayBuffer>[]=[];let count=0;
    if(response.body){const reader=response.body.getReader();while(true){const {value,done}=await reader.read();if(done)break;reset();chunks.push(value as Uint8Array<ArrayBuffer>);count+=value.length;loaded.set(asset.url,Math.min(count,asset.bytes));progress();}}
    else {const buffer=await response.arrayBuffer();chunks.push(new Uint8Array(buffer));}
    const blob=new Blob(chunks,{type:response.headers.get('content-type')|| (asset.kind==='video'?'video/mp4':asset.kind==='audio'?'audio/mpeg':'image/jpeg')});
    const url=URL.createObjectURL(blob);
    if(asset.kind==='image'){try{const image=new Image();image.src=url;await image.decode();}catch(error){URL.revokeObjectURL(url);throw error;}}
    cache.set(asset.url,url);loaded.set(asset.url,asset.bytes);progress();
  }finally{clearTimeout(timeout!);}
}
async function fonts(){
  const css=getComputedStyle(document.documentElement);
  const names=['"Bebas Neue"',css.getPropertyValue('--font-tanker').split(',')[0].trim(),css.getPropertyValue('--font-pally').split(',')[0].trim()].filter(Boolean);
  let timeout:ReturnType<typeof setTimeout>;
  try{await Promise.race([Promise.all(names.map(name=>document.fonts.load(`1em ${name}`))).then(()=>document.fonts.ready),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('Font timeout')),20000);})]);}
  finally{clearTimeout(timeout!);}
}
const frame=()=>new Promise<void>(resolve=>requestTick(()=>resolve()));
async function warmup(){
  assetStatus.phase='warming';actualProgressRef.current=95;
  document.documentElement.dataset.warming='true';
  const filters=Array.from(document.querySelectorAll<SVGFEDisplacementMapElement>('feDisplacementMap'));
  const old=filters.map(f=>f.getAttribute('scale'));filters.forEach(f=>f.setAttribute('scale','1'));
  const titles=Array.from(document.querySelectorAll<HTMLElement>('.project-metadata .title-slot'));
  const previous=titles.map(t=>t.style.filter);
  const titleFilter=document.querySelector('.project-metadata filter')?.id;
  if(titleFilter)titles.forEach(t=>t.style.filter=`url(#${titleFilter})`);
  // Keep renderable content beneath the opaque loader: display:none/opacity:0 can skip rasterization.
  const lenses=Array.from(document.querySelectorAll<HTMLElement>('.liquid-surface'));
  const lensStyles=lenses.map(lens=>{const content=lens.querySelector<HTMLElement>('.liquid-content');const filter=lens.querySelector('filter');const prior=content?.style.filter??'';if(content&&filter)content.style.filter=`url(#${filter.id})`;return {content,prior};});
  const flares=Array.from(document.querySelectorAll<SVGElement>('.video-rim-flare'));
  const flareStyles=flares.map(flare=>flare.style.cssText);flares.forEach(flare=>{flare.style.display='';flare.style.opacity='0.001';});
  window.dispatchEvent(new Event('portfolio-warmup'));
  try{await frame();actualProgressRef.current=98;await frame();}
  finally{filters.forEach((f,i)=>f.setAttribute('scale',old[i]??'0'));titles.forEach((t,i)=>t.style.filter=previous[i]);lensStyles.forEach(({content,prior})=>{if(content)content.style.filter=prior;});flares.forEach((flare,i)=>{flare.style.cssText=flareStyles[i];});delete document.documentElement.dataset.warming;}
  actualProgressRef.current=100;assetStatus.phase=streaming?'streaming':'ready';ready=true;
  window.dispatchEvent(new Event('portfolio-assets-ready'));
}
export function preloadAssets(){
  if(ready)return Promise.resolve();if(running)return running;
  assetStatus.errors=[];assetStatus.phase='downloading';
  running=(async()=>{
    let next=0;
    const worker=async()=>{while(next<manifest.length){const asset=manifest[next++];try{await download(asset);}catch{assetStatus.errors.push(asset.url);}}};
    await Promise.all([worker(),worker(),worker(),fonts().catch(()=>{assetStatus.errors.push('Fonts');})]);
    if(assetStatus.errors.length){assetStatus.phase='error';return;}
    await warmup();
  })().finally(()=>{running=null;});return running;
}
export async function continueStreaming(){streaming=true;assetStatus.errors=[];await warmup();}
// Keep object URLs for the document lifetime, including back-forward cache restores.
if(typeof window!=='undefined')window.addEventListener('pagehide',event=>{if(!event.persisted){cache.forEach(url=>URL.revokeObjectURL(url));cache.clear();}});
