import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {topology,createTopology} from '../cube-topology/topology.mjs';
import {generate,validate,measure,createModel,formatNet} from './model.mjs';
const data=JSON.parse(readFileSync(new URL('./results.json',import.meta.url)));

test('all 10000 saved solutions validate, reproduce, and obey shared-cell incidence and edge identities',()=>{
 assert.equal(data.records.length,10000);assert.equal(new Set(data.records.map(r=>r.seed)).size,10000);
 for(const r of data.records) {
   assert.deepEqual(generate(r.seed),{seed:r.seed,cells:r.cells,stats:r.stats});
   const v=validate(r.cells);assert.ok(v.valid);assert.deepEqual(measure(r.cells),r.metrics);
   for(const face of Object.values(v.faces)) {
     assert.equal(face.total,7);assert.deepEqual(face.rows,Array(7).fill(1));assert.deepEqual(face.columns,Array(7).fill(1));
     assert.equal(new Set(face.permutation).size,7);
   }
   const set=new Set(r.cells);let incidences=0;
   for(const cell of topology.physicalCells) {
     const values=cell.faceCells.map(ref=>v.faces[ref.face].permutation[ref.row]===ref.col);
     assert.ok(values.every(x=>x===set.has(cell.id)));incidences+=values.filter(Boolean).length;
   }
   const m=r.metrics;assert.equal(incidences,42);assert.equal(m.interior+2*m.edge+3*m.corner,42);
   assert.equal(m.edge+3*m.corner,12);assert.equal(m.distinct,30+m.corner);
   assert.ok(m.edgeOccupancy.every(e=>e.unicorns===1));assert.equal(m.coupledFacePairs,12);
 }
});

test('independent exhaustive physical subset oracle at n=2 matches complete global search',()=>{
 const t=createTopology(2),answers=[];
 for(let bits=0;bits<256;bits++) {
   const selected=t.physicalCells.filter((_,i)=>bits&(1<<i));
   // Direct geometry: each of the 12 cube edges must contain one endpoint.
   let valid=true;
   for(let varying=0;varying<3;varying++) for(let a=0;a<2;a++) for(let b=0;b<2;b++) {
     const fixed=[0,1,2].filter(k=>k!==varying);
     if(selected.filter(c=>c.coordinates[fixed[0]]===a&&c.coordinates[fixed[1]]===b).length!==1)valid=false;
   }
   const cells=selected.map(c=>c.id).sort();assert.equal(validate(cells,t).valid,valid);
   if(valid)answers.push(cells.join('|'));
 }
 const result=createModel(t).search(42,{limit:100});assert.equal(result.status,'exhausted');
 assert.equal(answers.length,2);assert.deepEqual(result.solutions.map(s=>s.join('|')).sort(),answers.sort());
});

test('validator rejects missing, extra, duplicate, unknown and conflicting edge/corner occupancy',()=>{
 const cells=data.records[0].cells;
 assert.equal(validate(null).valid,false);assert.equal(validate([]).valid,false);
 assert.equal(validate([...cells,cells[0]]).valid,false);
 assert.equal(validate([...cells,'3,3,3']).valid,false);
 assert.equal(validate([...cells,'00,0,0']).valid,false);
 for(const id of cells)assert.equal(validate(cells.filter(x=>x!==id)).valid,false);
 for(const cell of topology.physicalCells.filter(c=>!cells.includes(c.id)))assert.equal(validate([...cells,cell.id]).valid,false);
 const model=createModel();assert.equal(model.unitCount,84);assert.equal(model.optionCount,218);
 assert.equal(model.search(1,{maxNodes:1}).status,'node-limit');
 for(const seed of [-1,2**32,1.2,'1'])assert.throws(()=>generate(seed));
 assert.throws(()=>model.search(0,{limit:0}));
});

test('examples reproduce, span observed sharing, and nets encode all face permutations',()=>{
 const examples=JSON.parse(readFileSync(new URL('./examples.json',import.meta.url)));
 assert.deepEqual(Object.keys(examples),['few','moderate','high']);
 for(const e of Object.values(examples)) {
   assert.ok(validate(e.cells).valid);assert.deepEqual(measure(e.cells),e.metrics);
   assert.deepEqual(generate(e.seed).cells,e.cells);
   assert.equal(formatNet(e.cells).split('').filter(c=>c==='U').length,42);
 }
 assert.ok(examples.few.metrics.shared<examples.moderate.metrics.shared);
 assert.ok(examples.moderate.metrics.shared<examples.high.metrics.shared);
});
