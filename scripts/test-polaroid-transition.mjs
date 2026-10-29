import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
async function load(path){const {outputText}=ts.transpileModule(await readFile(path,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}});return import('data:text/javascript;base64,'+Buffer.from(outputText).toString('base64'));}
const {photoFrame,PHOTO_SWAP_MS,PHOTO_HIDE_MS,PHOTO_END_MS,ABOUT_REVEAL_MS}=await load('src/lib/polaroidTransition.ts');
assert.equal(PHOTO_SWAP_MS,40);assert.equal(PHOTO_HIDE_MS,2150);assert.equal(PHOTO_END_MS,2200);assert.equal(ABOUT_REVEAL_MS,900);
assert.equal(photoFrame(40).flash,1);assert.equal(photoFrame(300).flash,0);
for(const t of [40,300,600,850]){assert.equal(photoFrame(t).x,0);assert.equal(photoFrame(t).z,60);}
assert.equal(photoFrame(40).blur,6);assert.equal(photoFrame(850).blur,0);
assert.ok(photoFrame(1350).swing>20);assert.equal(photoFrame(2150).x,85);assert.equal(photoFrame(2150).wire,0);
let x=0;for(let t=850;t<=2150;t++){const s=photoFrame(t);assert.ok(s.x>=x);assert.ok(Number.isFinite(s.swing+s.pitch+s.yaw));x=s.x;}
const {viewFromPath,updateViewAddress}=await load('src/lib/viewNavigation.ts');
const pushes=[];globalThis.document={title:''};globalThis.window={location:{pathname:'/'},history:{pushState:(state,_,path)=>{pushes.push({state,path});window.location.pathname=path;}}};
assert.equal(viewFromPath('/about/'),'about');updateViewAddress('about',true);assert.equal(pushes[0].path,'/about');assert.equal(document.title,'Vishwas Kamath — About');updateViewAddress('about',true);assert.equal(pushes.length,1);window.location.pathname='/';updateViewAddress('work',false);assert.equal(pushes.length,1);assert.equal(document.title,'Vishwas Kamath — Motion Portfolio');
console.log('PASS upright hold, positive trailing swing, horizontal acceleration, separate hide/reset timing, canonical routes and popstate without duplicate history');
