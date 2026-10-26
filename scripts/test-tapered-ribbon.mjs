import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../src/lib/taperedRibbon.ts',import.meta.url),'utf8');
const {outputText}=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}});
const {smoothRibbon,ribbonEdges,drawRibbon}=await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
for(const points of [Array.from({length:45},(_,i)=>({x:i*5,y:Math.sin(i*.2)*50})),Array.from({length:45},()=>({x:30,y:40}))]){
  const curve=smoothRibbon(points),edges=ribbonEdges(curve);
  assert.equal(curve.length,180);
  assert.deepEqual(curve[0],points[0]);assert.deepEqual(curve.at(-1),points.at(-1));
  assert.ok([...edges.left,...edges.right].every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
  assert.ok(Math.abs(Math.hypot(edges.left[0].x-edges.right[0].x,edges.left[0].y-edges.right[0].y)-6.4)<1e-9);
  assert.deepEqual(edges.left.at(-1),edges.right.at(-1));
}
globalThis.Path2D=class{moveTo(){}lineTo(){}arc(){}closePath(){}};
const fills=[];
drawRibbon({fill(path){fills.push({path,filter:this.filter});},beginPath(){},arc(){},stroke(){throw Error('Segment strokes are forbidden');}},Array.from({length:45},(_,i)=>({x:i,y:i*.5})));
assert.equal(fills.length,3);assert.equal(fills[0].path,fills[1].path);
assert.equal(fills[0].filter,'blur(6px)');assert.equal(fills[1].filter,'none');
console.log('PASS 180 vertices, preserved endpoints, finite collapsed normals, continuous taper, shared two-pass polygon, no segment strokes');
