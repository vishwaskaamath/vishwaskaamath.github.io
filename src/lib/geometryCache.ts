/** Layout is measured in a coalesced task after mount/resize/settle, never in a render callback. */
type Box={x:number;y:number;left:number;right:number;top:number;bottom:number;width:number;height:number;layoutWidth:number;layoutHeight:number};
const boxes=new WeakMap<Element,Box>(),roots=new Set<Element>();
const empty:Box={x:0,y:0,left:0,right:0,top:0,bottom:0,width:0,height:0,layoutWidth:0,layoutHeight:0};
let timer:ReturnType<typeof setTimeout>|undefined,revision=0;
export let geometryMoving=false;
export const geometryRevision=()=>revision;
export const cachedBox=(element:Element)=>boxes.get(element)??empty;
export function refreshGeometry(){
  if(timer)return;
  timer=setTimeout(()=>{timer=undefined;
    const nodes=new Set<Element>();roots.forEach(root=>{nodes.add(root);root.querySelectorAll('.char-cell,.warp-text-content,.card-probe,.software-probe,.lens-probe').forEach(n=>nodes.add(n));});
    nodes.forEach(node=>{if(!node.isConnected)return;const b=node.getBoundingClientRect(),e=node as HTMLElement;boxes.set(node,{x:b.x,y:b.y,left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height,layoutWidth:e.offsetWidth??b.width,layoutHeight:e.offsetHeight??b.height});});revision++;
  },0);
}
export function setGeometryMoving(moving:boolean){if(geometryMoving===moving)return;geometryMoving=moving;if(!moving)refreshGeometry();}
let observer:ResizeObserver|undefined;
export function observeGeometry(root:Element){
  roots.add(root);
  if(!observer){observer=new ResizeObserver(refreshGeometry);window.addEventListener('resize',refreshGeometry);window.addEventListener('portfolio-geometry-settled',refreshGeometry);document.addEventListener('transitionend',refreshGeometry);document.fonts.ready.then(refreshGeometry);}
  observer.observe(root);refreshGeometry();
  return()=>{roots.delete(root);observer?.unobserve(root);if(!roots.size){observer?.disconnect();observer=undefined;window.removeEventListener('resize',refreshGeometry);window.removeEventListener('portfolio-geometry-settled',refreshGeometry);document.removeEventListener('transitionend',refreshGeometry);}};
}
