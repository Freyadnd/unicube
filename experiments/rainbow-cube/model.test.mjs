import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {topology as t,createTopology} from '../cube-topology/topology.mjs';
import {solve,validateMap} from '../single-face/model.mjs';
import {validate as validateCube,formatNet} from '../complete-cube/model.mjs';
import {grow,shape,validateBoard,countGlobal,countByFaces,alignColors,refine,regionNet} from './model.mjs';
const read=name=>JSON.parse(readFileSync(new URL(name,import.meta.url)));
const examples=read('./examples.json'),pools=read('./pools.json'),sources=read('../complete-cube/examples.json');

test('all 144 pool maps reproduce, connect, meet shape guards, and contain the saved face answer',()=>{
 let count=0;
 for(const [sourceName,faces] of Object.entries(pools))for(const [face,pool] of Object.entries(faces))for(const p of pool) {
   const planted=sources[sourceName].metrics.permutations[face];
   assert.deepEqual(grow(planted,p.seed),p.map);validateMap(p.map);
   const ps=solve(p.map);assert.equal(ps.length,p.localCount);assert.ok(ps.some(s=>s.join()===planted.join()));
   assert.deepEqual(shape(p.map),p.shape);assert.ok(p.shape.sizes.every(n=>n>=2&&n<=18));assert.ok(p.shape.leaves<=14);
   const sameBoundary=ps.filter(s=>Array.from({length:49},(_,i)=>i).filter(i=>i<7||i>=42||i%7===0||i%7===6).every(i=>(s[Math.floor(i/7)]===i%7)===(planted[Math.floor(i/7)]===i%7)));
   assert.equal(sameBoundary.length,1);count++;
 }
 assert.equal(count,144);
});

test('saved boards: exhaustive canonical counter agrees with independent face-domain join',()=>{
 assert.deepEqual(Object.keys(examples).sort(),['A','B','C','D']);
 for(const [key,e] of Object.entries(examples)) {
   validateBoard(e.maps,e.truth);
   const result=countGlobal(e.maps),oracle=countByFaces(e.maps);
   assert.ok(result.exact);assert.equal(result.count,e.globalCount);assert.equal(result.count,oracle.count);
   const sets=r=>r.solutions.map(s=>s.join('|')).sort();assert.deepEqual(sets(result),sets(oracle));
   assert.ok(result.solutions.some(s=>s.join()===e.truth.toSorted().join()));
   if(key!=='D')assert.equal(result.count,1);else assert.equal(result.count,2);
   for(const solution of result.solutions) {
     assert.ok(validateCube(solution).valid);validateBoard(e.maps,solution);
     const occupied=new Set(solution);
     for(const cell of t.physicalCells)for(const ref of cell.faceCells)assert.equal(occupied.has(cell.id),occupied.has(t.faceCellToPhysical(ref.face,ref.row,ref.col)));
   }
   for(const f of t.faces){assert.equal(solve(e.maps[f]).length,e.localCounts[f]);assert.ok(e.localCounts[f]>1);}
 }
});

test('refinement and presentation-only relabeling reproduce without changing logical solution sets',()=>{
 for(const [key,e] of Object.entries(examples)) {
   const source=sources[e.sourceName];const initial=Object.fromEntries(t.faces.map(f=>[f,grow(source.metrics.permutations[f],e.regionSeeds[f])]));
   const refined=key==='D'?{maps:initial,history:[]}:refine(initial,source.cells);
   assert.deepEqual(refined.maps,e.originalMaps);assert.deepEqual(refined.history,e.refinement??[]);
   const aligned=alignColors(refined.maps);assert.deepEqual(aligned.maps,e.maps);
   const score=xs=>xs.reduce((s,x)=>s+x.matches,0);assert.ok(score(aligned.after)>=score(aligned.before));
   assert.deepEqual(countGlobal(e.originalMaps).solutions.map(s=>s.join()).sort(),countGlobal(e.maps).solutions.map(s=>s.join()).sort());
   assert.equal(formatNet(e.truth).split('').filter(x=>x==='U').length,42);
   for(const f of t.faces)assert.equal(new Set(e.maps[f]).size,7);
   assert.ok(regionNet(e.maps).includes('R'));
 }
});

test('independent exhaustive subset oracle with face-local regions at n=2, including impossible boards',()=>{
 const cube=createTopology(2);let impossible=0;
 for(let variant=0;variant<16;variant++) {
   const maps=Object.fromEntries(cube.faces.map((f,i)=>[f,i<4&&(variant&(1<<i))?[0,0,0,1]:[0,0,1,1]]));
   const valid=[];
   for(let bits=0;bits<256;bits++) {
     const cells=cube.physicalCells.filter((_,i)=>bits&(1<<i)).map(c=>c.id);
     const occupied=new Set(cells);let okay=true;
     for(const f of cube.faces) {
       const rows=[0,0],cols=[0,0],regions=[0,0];
       for(let r=0;r<2;r++)for(let c=0;c<2;c++)if(occupied.has(cube.faceCellToPhysical(f,r,c))){rows[r]++;cols[c]++;regions[maps[f][r*2+c]]++;}
       if([...rows,...cols,...regions].some(n=>n!==1))okay=false;
     }
     if(okay)valid.push(cells.sort().join('|'));
   }
   const actual=countGlobal(maps,{t:cube});assert.ok(actual.exact);assert.equal(actual.count,valid.length);
   assert.deepEqual(actual.solutions.map(s=>s.join('|')).sort(),valid.sort());if(!valid.length)impossible++;
 }
 assert.ok(impossible>0);
});

test('invalid maps/answers rejected and capped counts never assert uniqueness',()=>{
 const e=examples.A;
 assert.throws(()=>validateBoard({...e.maps,front:Array(49).fill(0)}));
 const disconnected=[0,1,1,0];assert.throws(()=>validateMap(disconnected,2));
 assert.throws(()=>validateBoard(e.maps,e.truth.slice(1)));
 assert.throws(()=>grow([0,0,2,3,4,5,6],0));assert.throws(()=>grow([0,1,2,3,4,5,6],-1));
 const capped=countGlobal(e.maps,{limit:1});assert.equal(capped.count,1);assert.equal(capped.exact,false);
 assert.equal(countGlobal(e.maps,{maxNodes:1}).status,'node-limit');
 assert.throws(()=>countGlobal(e.maps,{limit:0}));
});
