import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile('src/lib/pageWipe.ts','utf8');
const {outputText}=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}});
const {wipeTiles,tileCovered,WIPE_SWAP_MS,WIPE_UNCOVER_MS,WIPE_END_MS}=await import('data:text/javascript;base64,'+Buffer.from(outputText).toString('base64'));
assert.equal(wipeTiles.length,160);assert.equal(new Set(wipeTiles.map(t=>`${t.col}:${t.row}`)).size,160);
for(const tile of wipeTiles){assert.ok(tile.delay>=0&&tile.delay<480);assert.equal(tileCovered(560,tile.delay),true);assert.equal(tileCovered(WIPE_SWAP_MS,tile.delay),true);assert.equal(tileCovered(719,tile.delay),true);assert.equal(tileCovered(WIPE_END_MS,tile.delay),false);assert.equal(tileCovered(WIPE_UNCOVER_MS+tile.delay,tile.delay),false);}
const bottomLeft=wipeTiles.find(t=>t.col===0&&t.row===9),topRight=wipeTiles.find(t=>t.col===15&&t.row===0);assert.ok(bottomLeft.delay<topRight.delay);
for(const t of wipeTiles){assert.equal(tileCovered(t.delay,t.delay),true);assert.equal(tileCovered(t.delay+720,t.delay),false);}
assert.equal(wipeTiles.filter(t=>tileCovered(880,t.delay)).length>0,true);assert.equal(wipeTiles.filter(t=>tileCovered(880,t.delay)).length<160,true);
console.log('PASS 160 unique tiles, diagonal stepped delays, fully covered swap/hold, same-direction reveal, complete by 1350ms');
