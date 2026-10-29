import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const {outputText}=ts.transpileModule(await readFile('src/lib/polaroidTransition.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}});
const {photoFrame,PHOTO_SWAP_MS,PHOTO_END_MS,ABOUT_REVEAL_MS}=await import('data:text/javascript;base64,'+Buffer.from(outputText).toString('base64'));
assert.equal(PHOTO_SWAP_MS,35);assert.equal(PHOTO_END_MS,900);assert.equal(ABOUT_REVEAL_MS,120);
assert.equal(photoFrame(0).flash,0);assert.ok(photoFrame(35).flash>.999);assert.equal(photoFrame(260).flash,0);
assert.equal(photoFrame(35).x,50);assert.equal(photoFrame(35).y,22);assert.equal(photoFrame(35).scale,.38);
assert.equal(photoFrame(900).x,118);assert.equal(photoFrame(900).y,4);assert.equal(photoFrame(900).z,-400);assert.ok(Math.abs(photoFrame(900).scale-.14)<1e-9);
assert.equal(photoFrame(650).wire,1);assert.equal(photoFrame(900).wire,0);
let previous=photoFrame(35);for(let t=36;t<=900;t++){const s=photoFrame(t);assert.ok(s.x>=previous.x&&s.y<=previous.y&&s.scale<=previous.scale);assert.ok(Number.isFinite(s.swing));previous=s;}
assert.ok(photoFrame(120).x>50&&photoFrame(120).flash<1);
console.log('PASS flash peak/capture at 35ms, overlapping flight/headline at 120ms, accelerating offscreen exit, 900ms cleanup');
