import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {random,solve,validateMap,validatePlacement} from '../single-face/model.mjs';
import {generate,boundary,occupied,distinguish,deduce,analyze} from './model.mjs';

test('deterministic planted generation, connectivity, constraints, and B rejection',()=>{
  for (const variant of ['A','B','C']) {
    const a=random(42),b=random(42); let rejected=0;
    for(let k=0;k<100;k++) {
      const board=generate(a,variant); assert.deepEqual(board,generate(b,variant));
      assert.equal(validateMap(board.map),true); assert.equal(validatePlacement(board.map,board.planted),true);
      assert.ok(solve(board.map).some(p=>p.join()===board.planted.join()));
      assert.equal(board.sizes.reduce((a,b)=>a+b),49); rejected+=board.attempts-1;
      if(variant==='B') assert.ok(board.sizes.every(s=>s>=2)); else assert.equal(board.attempts,1);
    }
    if(variant==='B') assert.ok(rejected>0);
  }
  assert.throws(()=>generate(random(1),'D'));
  assert.throws(()=>generate(random(1),'B',1));
  assert.throws(()=>generate(random(1),'A',7,0),/limit/);
  assert.deepEqual(generate(random(1),'C',1).map,[0]);
});

// Independent oracle enumerates all subsets of the cells directly, then filters solutions.
function exhaustive(solutions,index,cells,n) {
  let min=null;
  for(let bits=0;bits<2**cells.length;bits++) {
    const clues=cells.filter((_,i)=>bits & 2**i);
    if(min!==null && clues.length>=min) continue;
    const matches=solutions.filter(p=>clues.every(i=>
      (p[Math.floor(i/n)]===i%n)===(solutions[index][Math.floor(i/n)]===i%n)));
    if(matches.length===1) min=clues.length;
  }
  return min;
}
test('distinguishing masks match independent subset enumeration including corners and impossibility',()=>{
  const stripes=Array.from({length:9},(_,i)=>Math.floor(i/3)), solutions=solve(stripes,3);
  for(const cells of [[0,1,2,3,5,6,7,8], [4],[],[0,8]]) for(let i=0;i<solutions.length;i++)
    assert.equal(distinguish(solutions,i,cells,3).minimum,exhaustive(solutions,i,cells,3));
  assert.equal(Array.from({length:49},(_,i)=>i).filter(i=>boundary(i)).length,24);
  for(const i of [0,6,42,48]) assert.ok(boundary(i));
  assert.equal(boundary(24),false);
  const p=[0,1,2,3,4,5,6],q=[0,2,1,3,4,5,6];
  assert.equal(distinguish([p,q],0,Array.from({length:49},(_,i)=>i).filter(i=>boundary(i))).minimum,null);
  assert.equal(distinguish([p],0,[]).minimum,0);
  const independentSwaps=[p,[1,0,2,3,4,5,6],[0,1,3,2,4,5,6],[0,1,2,3,5,4,6]];
  const clues=[0,16,32];
  assert.equal(distinguish(independentSwaps,0,clues).minimum,3);
  assert.equal(distinguish(independentSwaps,0,clues).minimum,exhaustive(independentSwaps,0,clues,7));
});

test('human deduction propagates singles, detects invalid facts, remains sound without branching',()=>{
  assert.equal(deduce([0,0,0,1],[],2).solved,true);
  const stripes=Array.from({length:49},(_,i)=>Math.floor(i/7));
  assert.equal(deduce(stripes).trace.length,0);
  assert.throws(()=>deduce(stripes,[{cell:0,value:1},{cell:1,value:1}]),/Contradictory/);
  assert.throws(()=>deduce(stripes,[{cell:49,value:1}]),/Invalid/);
  assert.throws(()=>deduce(stripes,Array.from({length:7},(_,cell)=>({cell,value:0}))),/Contradictory/);
  const rng=random(137);
  for(let k=0;k<50;k++) {
    const {map,planted}=generate(rng,'A'), solutions=solve(map);
    const clues=[0,6,42].map(cell=>({cell,value:+occupied(planted,cell)}));
    for(const given of [[],clues]) {
      const d=deduce(map,given), compatible=solutions.filter(p=>given.every(c=>+occupied(p,c.cell)===c.value));
      assert.ok(compatible.length);
      for(const p of compatible) d.state.forEach((v,i)=>{if(v!==-1) assert.equal(v,+occupied(p,i));});
    }
  }
});

test('all saved low-ambiguity sets and metrics reproduce; representatives contain requested categories',()=>{
  const {records}=JSON.parse(readFileSync(new URL('./results.json',import.meta.url)));
  for(const r of records.filter(r=>r.analysis)) {
    assert.deepEqual(solve(r.map),r.solutions);
    const a=analyze(r.map,r.solutions,r.planted);
    assert.deepEqual(a.truths,r.analysis.truths);
    assert.deepEqual(a.differing,r.analysis.differing);
    for(let i=0;i<r.solutions.length;i++) for(const key of ['all','edge']) {
      const metric=a.truths[i][key];
      if(metric.witness!==null) assert.equal(r.solutions.filter(p=>metric.witness.every(cell=>occupied(p,cell)===occupied(r.solutions[i],cell))).length,1);
    }
  }
  const ex=JSON.parse(readFileSync(new URL('./examples.json',import.meta.url)));
  assert.deepEqual(Object.keys(ex).sort(),['twoSolutionEdge','threeToFiveEdge','multipleEdgeClues','notEdgeResolvable'].sort());
  for(const r of Object.values(ex)) assert.deepEqual(analyze(r.map,r.solutions,r.planted),r.analysis);
});
