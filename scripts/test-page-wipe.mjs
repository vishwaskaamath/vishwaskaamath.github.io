import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const {outputText}=ts.transpileModule(await readFile('src/lib/pageWipe.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}});
const {wipeTiles,tileFill,labelPose,createWipeClock,advanceWipeClock,WIPE_SWAP_MS,WIPE_REVEAL_MS,WIPE_END_MS}=await import('data:text/javascript;base64,'+Buffer.from(outputText).toString('base64'));
assert.equal(wipeTiles.length,160);
for(const tile of wipeTiles){
 for(const ms of [600,WIPE_SWAP_MS,WIPE_REVEAL_MS])assert.equal(tileFill(ms,tile.threshold),1);
 assert.equal(tileFill(0,tile.threshold),0);assert.equal(tileFill(WIPE_END_MS,tile.threshold),0);
 for(let t=1;t<=600;t++)assert.ok(tileFill(t,tile.threshold)>=tileFill(t-1,tile.threshold));
 for(let t=Math.ceil(WIPE_REVEAL_MS);t<=WIPE_END_MS;t++)assert.ok(tileFill(t,tile.threshold)<=tileFill(t-1,tile.threshold));
}
for(const hz of [60,120,240]){
 const clock=createWipeClock(0);let now=0,swaps=0,uncoverZero=false,closingSamples=0;
 while(clock.elapsed<WIPE_END_MS){
  const before=clock.elapsed;now+=1000/hz;
  const swapped=advanceWipeClock(clock,now);
  assert.ok(clock.elapsed-before<=16.670001);
  if(swapped){
   swaps++;assert.equal(clock.elapsed,WIPE_SWAP_MS);
   // Simulate a 180ms React stall followed by two paint opportunities.
   now+=180;advanceWipeClock(clock,now);assert.equal(clock.elapsed,WIPE_SWAP_MS);
   now+=1000/hz;advanceWipeClock(clock,now);assert.equal(clock.elapsed,WIPE_SWAP_MS);
  }
  if(clock.elapsed===WIPE_REVEAL_MS){uncoverZero=true;assert.equal(labelPose(clock.elapsed).alpha,1);}
  if(clock.elapsed>WIPE_REVEAL_MS&&clock.elapsed<WIPE_END_MS){const pose=labelPose(clock.elapsed);assert.ok(pose.alpha>0&&pose.alpha<1);closingSamples++;}
 }
 assert.equal(swaps,1);assert.ok(uncoverZero);assert.ok(closingSamples>25);
}
assert.deepEqual(labelPose(WIPE_END_MS),{offset:-90,alpha:0});
assert.ok(Math.abs(labelPose(WIPE_REVEAL_MS+.1).alpha-1)<.000001);
const stalled=createWipeClock(100);advanceWipeClock(stalled,1100);assert.equal(stalled.elapsed,16.67);
console.log('PASS capped 60/120/240Hz timeline, 180ms swap stall, two-frame buffer, zero-progress uncover, continuous tile and label exits');
