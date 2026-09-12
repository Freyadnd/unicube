import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {topology as t} from '../experiments/cube-topology/topology.mjs';
import {countGlobal} from '../experiments/rainbow-cube/model.mjs';
import {makeVariants,clueOrder} from '../src/variants.mjs';
import {createPlayer,UNKNOWN,UNICORN} from '../src/player.mjs';
const fixtures=JSON.parse(readFileSync(new URL('../experiments/rainbow-cube/examples.json',import.meta.url)));
const variants=makeVariants(fixtures);

test('A/B/C variants are unique and D remains the two-solution debug board',()=>{
 for(const id of ['A','B','C0','C2','C4','C7','D']) assert.equal(countGlobal(variants[id].maps).count,id==='D'?2:1);
});
test('C clue variants preserve identical maps/truth and deterministic greedy ordering',()=>{
 for(const id of ['C0','C2','C4','C7']) {assert.deepEqual(variants[id].maps,fixtures.C.maps);assert.deepEqual(variants[id].truth,fixtures.C.truth);}
 const ranking=clueOrder(fixtures.C), expected=['6,0,1','0,6,0','6,3,0','1,6,6','3,0,6','6,6,2','0,0,2'];
 assert.deepEqual(ranking.order.slice(0,7),expected);assert.deepEqual(ranking.steps.slice(0,7).map(s=>s.after),[
   {front:2,back:26,left:8,right:2,top:60,bottom:9},
   {front:2,back:13,left:2,right:2,top:18,bottom:9},
   {front:2,back:1,left:2,right:2,top:18,bottom:9},
   {front:1,back:1,left:2,right:2,top:3,bottom:9},
   {front:1,back:1,left:2,right:2,top:3,bottom:1},
   {front:1,back:1,left:2,right:2,top:1,bottom:1},
   {front:1,back:1,left:1,right:2,top:1,bottom:1}
 ]);
 assert.deepEqual(variants.C2.fixed,expected.slice(0,2));assert.deepEqual(variants.C4.fixed,expected.slice(0,4));assert.deepEqual(variants.C7.fixed,expected);
 for(const id of ['C2','C4','C7'])assert.ok(variants[id].fixed.every(x=>fixtures.C.truth.includes(x)));
});
test('fixed shared clues synchronize, cannot be edited, and reset preserves them',()=>{
 const shared=variants.C7.fixed.find(id=>t.physicalToFaceCells(id).length>1);assert.ok(shared);
 const p=createPlayer(fixtures.C.maps,t,variants.C7.fixed);assert.equal(p.get(shared),UNICORN);
 p.cycle(shared);assert.equal(p.get(shared),UNICORN);assert.equal(p.canUndo,false);
 const other=t.physicalCells.find(c=>!p.fixed.has(c.id)).id;p.cycle(other);assert.equal(p.get(other),1);p.reset();assert.equal(p.get(shared),UNICORN);assert.equal(p.get(other),UNKNOWN);assert.equal(p.canUndo,true);p.undo();assert.equal(p.get(other),1);
 for(const ref of t.physicalToFaceCells(shared))assert.equal(p.get(t.faceCellToPhysical(ref.face,ref.row,ref.col)),UNICORN);
});
test('switching variant model resets all transient state and keeps only new fixed clues',()=>{
 const p=createPlayer(variants.C2.maps,t,variants.C2.fixed),other=t.physicalCells.find(c=>!p.fixed.has(c.id)).id;p.cycle(other);assert.equal(p.canUndo,true);assert.equal(p.get(other),1);
 const q=createPlayer(variants.C4.maps,t,variants.C4.fixed);assert.equal(q.canUndo,false);assert.equal(q.get(other),q.fixed.has(other)?UNICORN:UNKNOWN);assert.equal(q.evaluate().contradictions.length,0);
});
