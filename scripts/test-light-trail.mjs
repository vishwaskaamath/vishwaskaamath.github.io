import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../src/lib/lightTrail.ts',import.meta.url),'utf8');
const {outputText}=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}});
const {spline,recordPoint}=await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const points=[];recordPoint(points,0,0);recordPoint(points,2,0);assert.equal(points.length,1);
for(let i=1;i<=60;i++)recordPoint(points,i*3,0);
assert.equal(points.length,32);assert.equal(points.at(-1).x,180);
const original=JSON.stringify(points);spline(points);assert.equal(JSON.stringify(points),original);
const circle=Array.from({length:32},(_,i)=>({x:100*Math.cos(i/31*Math.PI*1.8),y:100*Math.sin(i/31*Math.PI*1.8),age:1-i/31}));
const curve=spline(circle);
for(let i=0;i<32;i++)assert.ok(Math.hypot(curve[i*4].x-circle[i].x,curve[i*4].y-circle[i].y)<1e-10);
assert.ok(Math.max(...curve.slice(4,-4).map(p=>Math.abs(Math.hypot(p.x,p.y)-100)))<0.1);
for(const input of [[{x:0,y:0,age:1},{x:0,y:0,age:0}],[{x:0,y:0,age:1},{x:3,y:0,age:.6},{x:3,y:3,age:.3},{x:0,y:3,age:0}]]) {
  for(const p of spline(input))assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));
}
console.log('PASS spacing, 32-sample cap, immutable history, exact knots, circular fidelity, duplicate/tight-turn stability');

