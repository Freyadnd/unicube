import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createTopology,topology as t,frames} from './topology.mjs';
import {formatNet} from './debug.mjs';

// Independently written coordinate equations and seam expectations from the drawing.
const xyz={front:(r,c,m)=>[c,m-r,m],back:(r,c,m)=>[m-c,m-r,0],
  left:(r,c,m)=>[0,m-r,c],right:(r,c,m)=>[m,m-r,m-c],
  top:(r,c,m)=>[c,m,r],bottom:(r,c,m)=>[c,0,m-r]};
const seams=[
 ['front','top','top','bottom',false],['front','right','right','left',false],
 ['front','bottom','bottom','top',false],['front','left','left','right',false],
 ['back','top','top','top',true],['back','right','left','left',false],
 ['back','bottom','bottom','bottom',true],['back','left','right','right',false],
 ['left','top','top','left',false],['left','bottom','bottom','left',true],
 ['right','top','top','right',true],['right','bottom','bottom','right',false],
];
const cornerRefs={
 '0,0,0':['back:6,6','left:6,0','bottom:6,0'],
 '0,0,6':['front:6,0','left:6,6','bottom:0,0'],
 '0,6,0':['back:0,6','left:0,0','top:0,0'],
 '0,6,6':['front:0,0','left:0,6','top:6,0'],
 '6,0,0':['back:6,0','right:6,6','bottom:6,6'],
 '6,0,6':['front:6,6','right:6,0','bottom:0,6'],
 '6,6,0':['back:0,0','right:0,6','top:0,6'],
 '6,6,6':['front:0,6','right:0,0','top:6,6'],
};
const refKey=r=>`${r.face}:${r.row},${r.col}`;

test('six orthonormal exterior-view frames: column cross negative-row = outward normal',()=>{
 const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
 for(const f of Object.values(frames)) {
   assert.equal(dot(f.row,f.column),0);
   for(const v of [f.row,f.column,f.normal]) assert.equal(dot(v,v),1);
   const a=f.column,b=f.row.map(x=>-x);
   const cross=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]].map(x=>x===0?0:x);
   assert.deepEqual(cross,f.normal);
 }
});

test('all 294 references round-trip, match independent geometry, and have exact incidence type',()=>{
 let count=0;
 for(const face of t.faces) {
   const seen=new Set();
   for(let row=0;row<7;row++) for(let col=0;col<7;col++) {
     const id=t.faceCellToPhysical(face,row,col), refs=t.physicalToFaceCells(id);
     assert.equal(id,xyz[face](row,col,6).join(','));
     assert.ok(refs.some(r=>r.face===face&&r.row===row&&r.col===col));
     assert.equal(refs.length,1+Number(row===0||row===6)+Number(col===0||col===6));
     for(const r of refs) assert.equal(t.faceCellToPhysical(r.face,r.row,r.col),id);
     seen.add(id); count++;
   }
   assert.equal(seen.size,49);
 }
 assert.equal(count,294);
 const histogram={1:0,2:0,3:0};
 for(const c of t.physicalCells) histogram[c.faceCells.length]++;
 assert.deepEqual(histogram,{1:150,2:60,3:8});
 assert.equal(t.physicalCells.length,218);
 // Independently enumerate the full integer cube shell; no face-based construction.
 const shell=[];
 for(let x=0;x<7;x++) for(let y=0;y<7;y++) for(let z=0;z<7;z++)
   if([x,y,z].some(v=>v===0||v===6)) shell.push(`${x},${y},${z}`);
 assert.deepEqual(t.physicalCells.map(c=>c.id).sort(),shell.sort());
});

test('all 12 explicit seam mappings at all 7 positions, in both directions',()=>{
 assert.equal(t.edges.length,12);
 const used=new Set(),interiors=new Set();
 for(const [fa,sa,fb,sb,reversed] of seams) {
   const edge=t.edges.find(e=>e.a.face===fa&&e.a.side===sa||e.b.face===fa&&e.b.side===sa);
   assert.ok(edge); assert.equal(edge.interiorCells.length,5); assert.equal(edge.cells.length,7);
   edge.interiorCells.forEach(id=>{assert.equal(t.physicalToFaceCells(id).length,2);interiors.add(id);});
   used.add(`${fa}:${sa}`);used.add(`${fb}:${sb}`);
   for(const [f,s,g,h] of [[fa,sa,fb,sb],[fb,sb,fa,sa]]) for(let i=0;i<7;i++) {
     const j=reversed?6-i:i, expected=t.edgeCell(g,h,j), got=t.mapEdge(f,s,i);
     assert.deepEqual(got,{...expected,side:h,index:j,orientation:reversed?'reversed':'preserved'});
     const src=t.edgeCell(f,s,i);
     assert.equal(t.faceCellToPhysical(f,src.row,src.col),t.faceCellToPhysical(g,got.row,got.col));
     const back=t.mapEdge(g,h,j); assert.equal(back.face,f);assert.equal(back.side,s);assert.equal(back.index,i);
   }
 }
 assert.equal(used.size,24);assert.equal(interiors.size,60);
});

test('all eight corners match explicit triples and three incident physical edges',()=>{
 assert.deepEqual(t.corners.map(c=>c.id).sort(),Object.keys(cornerRefs).sort());
 for(const [id,refs] of Object.entries(cornerRefs)) {
   assert.deepEqual(t.physicalToFaceCells(id).map(refKey).sort(),refs.toSorted());
   assert.equal(new Set(t.physicalToFaceCells(id).map(r=>r.face)).size,3);
   assert.equal(t.edges.filter(e=>e.cells[0]===id||e.cells.at(-1)===id).length,3);
 }
});

test('physical neighbors match independent shell Manhattan adjacency; connected closed surface',()=>{
 let degrees=0;
 for(const cell of t.physicalCells) {
   const expected=t.physicalCells.filter(other=>other.coordinates.reduce((s,x,k)=>s+Math.abs(x-cell.coordinates[k]),0)===1).map(c=>c.id).sort();
   const actual=t.physicalNeighbors(cell.id);
   assert.deepEqual(actual,expected);assert.equal(actual.length,cell.faceCells.length===3?3:4);
   assert.equal(new Set(actual).size,actual.length);assert.ok(!actual.includes(cell.id));
   for(const id of actual) assert.ok(t.physicalNeighbors(id).includes(cell.id));
   degrees+=actual.length;
 }
 const seen=new Set([t.physicalCells[0].id]);
 for(const id of seen) for(const next of t.physicalNeighbors(id)) seen.add(next);
 assert.equal(seen.size,218);assert.equal(degrees/2,432);
 // 6*(n-1)^2 elementary grid quadrilaterals: Euler characteristic of a sphere.
 assert.equal(218-432+6*36,2);
});

test('general n=2,3,4,8 counts, incidences and every seam coordinate',()=>{
 for(const n of [2,3,4,8]) {
   const cube=createTopology(n),m=n-1;
   assert.equal(cube.physicalCells.length,6*(n-2)**2+12*(n-2)+8);
   assert.equal(cube.physicalCells.reduce((s,c)=>s+c.faceCells.length,0),6*n*n);
   for(const [inc,count] of [[1,6*(n-2)**2],[2,12*(n-2)],[3,8]])
     assert.equal(cube.physicalCells.filter(c=>c.faceCells.length===inc).length,count);
   for(const [f,s,g,h,rev] of seams) for(let i=0;i<n;i++) {
     const got=cube.mapEdge(f,s,i);assert.equal(got.face,g);assert.equal(got.side,h);assert.equal(got.index,rev?m-i:i);
     const src=cube.edgeCell(f,s,i);
     assert.equal(cube.faceCellToPhysical(f,src.row,src.col),cube.faceCellToPhysical(g,got.row,got.col));
   }
   assert.equal(cube.edges.length,12);assert.ok(cube.edges.every(e=>e.interiorCells.length===n-2));
 }
});

test('invalid inputs rejected, canonical data immutable, repeated construction deterministic',()=>{
 for(const n of [0,1,-1,2.5,NaN,Infinity,'7']) assert.throws(()=>createTopology(n));
 for(const f of ['Front','unknown','toString','__proto__',null]) assert.throws(()=>t.faceCellToPhysical(f,0,0));
 for(const i of [-1,7,1.5,NaN,'0']) {
   assert.throws(()=>t.faceCellToPhysical('front',i,0));assert.throws(()=>t.faceCellToPhysical('front',0,i));
   assert.throws(()=>t.mapEdge('front','top',i));
 }
 assert.throws(()=>t.mapEdge('front','unknown',0));
 for(const id of ['3,3,3','7,0,0','00,0,0',[0,0,0],null]) {
   assert.throws(()=>t.physicalToFaceCells(id));assert.throws(()=>t.physicalNeighbors(id));
 }
 assert.throws(()=>t.physicalToFaceCells('0,0,0').push({}));
 assert.throws(()=>{frames.front.row[1]=1;});
 assert.deepEqual(createTopology().physicalCells,t.physicalCells);
 assert.deepEqual(createTopology().edges,t.edges);
 const saved=JSON.parse(readFileSync(new URL('./topology.json',import.meta.url)));
 assert.deepEqual(saved,{n:t.n,frames:t.frames,physicalCells:t.physicalCells,edges:t.edges,corners:t.corners});
 assert.equal(readFileSync(new URL('./net.txt',import.meta.url),'utf8'),formatNet(t));
 // Uncut hinges in the displayed net: endpoint order must agree on the sheet.
 for(const [face,side,target,targetSide] of [
   ['left','right','front','left'],['front','right','right','left'],
   ['right','right','back','left'],['front','top','top','bottom'],
   ['front','bottom','bottom','top'],
 ]) for(let i=0;i<7;i++) {
   const next=t.mapEdge(face,side,i);
   assert.equal(next.face,target);assert.equal(next.side,targetSide);assert.equal(next.index,i);
 }
});
