import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {topology as t} from '../experiments/cube-topology/topology.mjs';
import {countGlobal} from '../experiments/rainbow-cube/model.mjs';
import {createPlayer,UNKNOWN,EXCLUDED,UNICORN,leftClickState} from '../src/player.mjs';
const board=JSON.parse(readFileSync(new URL('../experiments/rainbow-cube/examples.json',import.meta.url))).C;
function place(p,id){p.cycle(id);p.cycle(id);}

test('all 294 face references share canonical state through the entire cycle and undo',()=>{
 const p=createPlayer(board.maps);
 for(const cell of t.physicalCells){
   for(const expected of [EXCLUDED,UNICORN,UNKNOWN]){p.cycle(cell.id);for(const r of cell.faceCells)assert.equal(p.get(t.faceCellToPhysical(r.face,r.row,r.col)),expected);}
   p.undo();assert.equal(p.get(cell.id),UNICORN);p.undo();assert.equal(p.get(cell.id),EXCLUDED);p.undo();assert.equal(p.get(cell.id),UNKNOWN);
 }
 assert.equal(p.canUndo,false);assert.throws(()=>p.cycle('bad'));
});

test('normal feedback follows rules, not ground truth; row, column, region and empty-unit contradictions',()=>{
 const p=createPlayer(board.maps),wrong=t.physicalCells.find(c=>!board.truth.includes(c.id));place(p,wrong.id);
 assert.equal(p.evaluate().contradictions.length,0);assert.equal(p.evaluate().solved,false);
 const make=(a,b)=>{const q=createPlayer(board.maps);place(q,a);place(q,b);return q.evaluate();};
 const cell=(r,c)=>t.faceCellToPhysical('front',r,c);
 assert.ok(make(cell(0,0),cell(0,1)).contradictions.some(c=>c.face==='front'&&c.kind==='row'));
 assert.ok(make(cell(0,0),cell(1,0)).contradictions.some(c=>c.face==='front'&&c.kind==='column'));
 const pair=[];for(let a=0;a<49;a++)for(let b=a+1;b<49;b++)if(board.maps.front[a]===board.maps.front[b]&&Math.floor(a/7)!==Math.floor(b/7)&&a%7!==b%7)pair.push([a,b]);
 const [a,b]=pair[0];assert.ok(make(cell(Math.floor(a/7),a%7),cell(Math.floor(b/7),b%7)).contradictions.some(c=>c.face==='front'&&c.kind==='region'));
 const q=createPlayer(board.maps);for(let col=0;col<7;col++)q.cycle(cell(0,col));assert.ok(q.evaluate().contradictions.some(c=>c.reason==='no remaining cell'));
});

test('rules detect solved placements without requiring all empty cells marked; reset and reveal are atomic undo',()=>{
 const p=createPlayer(board.maps);for(const id of board.truth)place(p,id);
 assert.equal(p.evaluate().solved,true);assert.equal(p.evaluate().placed,board.truth.length);
 const original=p.marks();p.reset();assert.equal(p.evaluate().placed,0);p.undo();assert.deepEqual(p.marks(),original);
 p.reset();p.cycle(t.physicalCells[0].id);const before=p.marks();p.showSolution(board.truth);
 assert.equal(p.evaluate().solved,true);assert.equal(p.marks().excluded.length,218-board.truth.length);p.undo();assert.deepEqual(p.marks(),before);
 const retained=p.marks();assert.throws(()=>p.showSolution(board.truth.slice(1)));assert.deepEqual(p.marks(),retained);
});

test('existing global solver respects required and excluded canonical cells without changing unmarked counts',()=>{
 const base=countGlobal(board.maps);assert.equal(base.count,1);assert.ok(base.exact);
 const truth=new Set(board.truth),wrong=t.physicalCells.find(c=>!truth.has(c.id)).id;
 for(const cell of t.physicalCells.filter(c=>c.faceCells.length>1)) {
   const required=countGlobal(board.maps,{required:[cell.id]});assert.ok(required.exact);assert.equal(required.count,truth.has(cell.id)?1:0);
   const excluded=countGlobal(board.maps,{excluded:[cell.id]});assert.ok(excluded.exact);assert.equal(excluded.count,truth.has(cell.id)?0:1);
 }
 assert.equal(countGlobal(board.maps,{required:[wrong]}).count,0);
 assert.equal(countGlobal(board.maps,{required:board.truth}).count,1);
 assert.equal(countGlobal(board.maps,{required:[board.truth[0]],excluded:[board.truth[0]]}).count,0);
 assert.throws(()=>countGlobal(board.maps,{required:['not a cell']}));
 const p=createPlayer(board.maps);p.cycle(board.truth[0]);assert.equal(countGlobal(board.maps,p.marks()).count,0);p.undo();assert.equal(countGlobal(board.maps,p.marks()).count,1);
});

test('explicit semantic marks replace and toggle states',()=>{
 const p=createPlayer(board.maps);
 const id=t.physicalCells.find(c=>c.faceCells.length===1).id;
 p.set(id,UNICORN); assert.equal(p.get(id),UNICORN);
 p.set(id,UNKNOWN); assert.equal(p.get(id),UNKNOWN);
 p.set(id,EXCLUDED); assert.equal(p.get(id),EXCLUDED);
 p.set(id,UNKNOWN); assert.equal(p.get(id),UNKNOWN);
});

test('3D left-click transition path cycles blank, excluded, unicorn, blank',()=>{
 const p=createPlayer(board.maps),id=t.physicalCells.find(c=>c.faceCells.length===1).id;
 p.set(id,leftClickState(p.get(id))); assert.equal(p.get(id),EXCLUDED);
 p.set(id,leftClickState(p.get(id))); assert.equal(p.get(id),UNICORN);
 p.set(id,leftClickState(p.get(id))); assert.equal(p.get(id),UNKNOWN);
});
