import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const {outputText}=ts.transpileModule(await readFile('src/lib/pageWipe.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}});
const {wipeTiles,tileCovered,WIPE_SWAP_MS,WIPE_END_MS}=await import('data:text/javascript;base64,'+Buffer.from(outputText).toString('base64'));
assert.equal(wipeTiles.length,160);assert.equal(new Set(wipeTiles.map(t=>`${t.col}:${t.row}`)).size,160);
for(const t of wipeTiles){assert.ok(t.delay>=0&&t.delay<480);for(const ms of [560,WIPE_SWAP_MS,719])assert.equal(tileCovered(ms,t.delay),true);assert.equal(tileCovered(WIPE_END_MS,t.delay),false);assert.equal(tileCovered(t.delay+720,t.delay),false);}
assert.ok(wipeTiles.find(t=>t.col===0&&t.row===9).delay<wipeTiles.find(t=>t.col===15&&t.row===0).delay);
console.log('PASS 160 tiles, diagonal stagger, fully opaque swap/hold, matching uncover order, complete by 1350ms');
