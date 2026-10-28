import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const {outputText}=ts.transpileModule(await readFile('src/lib/taperedRibbon.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}});
const {recordPoint,expireHistory,sampleCatmullRom,drawCapsules}=await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const circle=Array.from({length:24},(_,i)=>Object.freeze({x:100*Math.cos(i*.12),y:100*Math.sin(i*.12),time:200-i*5}));
const before=JSON.stringify(circle),dense=sampleCatmullRom(circle);
assert.equal(JSON.stringify(circle),before);
for(let i=0;i<circle.length-1;i++){assert.ok(Math.hypot(dense[i*8].x-circle[i].x,dense[i*8].y-circle[i].y)<1e-8);}
for(const p of dense)assert.ok(Math.abs(Math.hypot(p.x,p.y)-100)<.2);
const history=[];recordPoint(history,0,0,0);const original=history[0];recordPoint(history,1,0,5);assert.equal(history.length,1);recordPoint(history,2,0,10);assert.deepEqual(original,{x:0,y:0,time:0});expireHistory(history,180);assert.equal(history.length,1);expireHistory(history,186);assert.equal(history.length,0);
for(const points of [[circle[0]],[circle[0],circle[0],circle[1]],[{x:0,y:0,time:1},{x:1,y:1,time:2},{x:0,y:0,time:3}]])for(const p of sampleCatmullRom(points))assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));
let strokes=0;const ctx={beginPath(){},moveTo(){},lineTo(){},stroke(){strokes++}};drawCapsules(ctx,dense,200);assert.ok(strokes>0);assert.equal(ctx.globalCompositeOperation,'lighten');assert.equal(ctx.lineCap,'round');
console.log('PASS immutable history, 1.5px sampling, 175ms expiry, control interpolation, circle radius, degenerate turns, round capsules');
