export type ContourPulse = {x:number;y:number;radius:number;elapsed:number;alpha:number};
export function spawnPulse(pulses:ContourPulse[],x:number,y:number) {
 pulses.push({x,y,radius:0,elapsed:0,alpha:1});
 if(pulses.length>5)pulses.splice(0,pulses.length-5);
}
export function advancePulses(pulses:ContourPulse[],dt:number) {
 for(let i=pulses.length-1;i>=0;i--){const p=pulses[i];p.elapsed+=dt;
 const progress=Math.min(1,p.elapsed/550);
 p.radius=320*(1-(1-progress)**3);p.alpha=1-progress;
 if(progress>=1)pulses.splice(i,1);
 }
}
