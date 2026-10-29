import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const {outputText}=ts.transpileModule(await readFile('src/lib/pageWipe.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}});
const {wipeTiles,tileFill,WIPE_SWAP_MS,WIPE_END_MS}=await import('data:text/javascript;base64,'+Buffer.from(outputText).toString('base64'));
assert.equal(wipeTiles.length,160);
for(const tile of wipeTiles){
 for(const ms of [600,WIPE_SWAP_MS,780])assert.equal(tileFill(ms,tile.threshold),1);
 assert.equal(tileFill(0,tile.threshold),0);
 assert.equal(tileFill(WIPE_END_MS,tile.threshold),0);
 for(let t=1;t<=600;t++)assert.ok(tileFill(t,tile.threshold)>=tileFill(t-1,tile.threshold));
 for(let t=781;t<=WIPE_END_MS;t++)assert.ok(tileFill(t,tile.threshold)<=tileFill(t-1,tile.threshold));
}
for(const hz of [60,120,240]){
 let partial=0;
 for(let t=0;t<600;t+=1000/hz)for(const tile of wipeTiles){const f=tileFill(t,tile.threshold);if(f>0&&f<1)partial++;}
 assert.ok(partial>160,'must animate intermediate fills at '+hz+'Hz');
}
for(let c=0;c<16;c++)for(let r=1;r<10;r++)assert.ok(wipeTiles[r*16+c].threshold<wipeTiles[(r-1)*16+c].threshold);
console.log('PASS continuous cover/uncover at 60/120/240Hz, bottom-up column order, opaque swap, empty finish');
