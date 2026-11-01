import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const {outputText}=ts.transpileModule(await readFile('src/lib/scrollPhysics.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}});
const {ScrollPhysics,reelOffset}=await import('data:text/javascript;base64,'+Buffer.from(outputText).toString('base64'));
for(const count of [5,9]) for(const hz of [60,120,240]){
 const e=new ScrollPhysics(count);e.configureStory(5000,900);let now=0;
 const settle=()=>{for(let i=0;i<hz*3;i++){now+=1000/hz;e.advance(now,false,1/hz);}};
 e.wheel(400,now);settle();assert.equal(e.read().index,1);assert.equal(reelOffset(0,1,5),1);assert.equal(reelOffset(1,0,5),-1);
 e.select(count-1,now);settle();assert.equal(e.read().index,count-1);assert.equal(e.read().storyScrollY,0);
 e.wheel(400,now);settle();assert.equal(e.read().index,0);assert.equal(e.read().handoff,0);
 e.wheel(-400,now);settle();assert.equal(e.read().index,count-1);
 e.wheel(-count*400*4,now);settle();assert.equal(e.read().index,count-1);assert.equal(reelOffset(count-1,-1,count),0);
 const saved=e.read().currentScroll;e.setView('about');settle();assert.equal(e.read().storyScrollY,900);assert.equal(e.read().handoff,1);
 let boundary=0;e.onBoundary=()=>boundary++;e.wheel(-60,now);e.wheel(-60,now);assert.equal(boundary,1);
 e.wheel(1000,now);settle();assert.equal(e.read().storyScrollY,1900);assert.equal(e.overshoot,0);
 e.scrollTo(999999,now);settle();assert.equal(e.read().progress,1);assert.equal(e.read().storyScrollY,5000);
 e.wheel(120,now);assert.equal(boundary,2);
 e.locked=true;const target=e.targetScroll;e.wheel(200,now);assert.equal(e.targetScroll,target);
 e.setView('work');e.locked=false;settle();assert.equal(e.read().currentScroll,saved);assert.equal(e.read().handoff,0);
 e.beginDrag();e.add(1,now);e.endDrag(-10,now);settle();assert.equal(e.read().index,0);
 console.log(`PASS ${count} projects / ${hz}Hz: infinite wrap both ways, synchronized offsets, story boundaries, transition lock, reel restore, drag`);
}
