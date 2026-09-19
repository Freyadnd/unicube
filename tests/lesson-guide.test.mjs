import test from 'node:test';
import assert from 'node:assert/strict';
import {lessons} from '../src/lesson-data.mjs';
import {directorLessons} from '../src/director-lesson-data.mjs';
import {validateMap} from '../src/region-map.mjs';
import {topology} from '../experiments/cube-topology/topology.mjs';

function valid(regions,unicorns){
  assert.equal(unicorns.length,4);
  for(const values of [unicorns.map(i=>Math.floor(i/4)),unicorns.map(i=>i%4),unicorns.map(i=>regions[i])])
    assert.deepEqual([...values].sort(),[0,1,2,3]);
}
test('tutorial examples and exercises obey row, column, and rainbow constraints',()=>{
  assert.deepEqual(lessons.map(x=>x.id),['only-spot','locked-pair']);
  assert.deepEqual(directorLessons.map(x=>x.id),['only-spot','locked-pair','row-column','rainbow-region','intersection','across-cube']);
  assert.equal(directorLessons[0],lessons[0]);assert.equal(directorLessons[1],lessons[1]);
  const [single,pair,lines,rainbow,intersection]=directorLessons;
  valid(single.board.regions,[...single.board.unicorns,14]);
  valid(single.exercise.regions,[...single.exercise.unicorns,single.exercise.answer]);
  valid(pair.board.regions,[...pair.board.unicorns,4,9,14]);
  valid(pair.exercise.regions,[...pair.exercise.unicorns,1,10,pair.exercise.answer]);
  valid(lines.board.regions,[...lines.board.unicorns,13]);
  valid(lines.exercise.regions,[...lines.exercise.unicorns,lines.exercise.answer]);
  valid(rainbow.board.regions,rainbow.board.unicorns);
  valid(rainbow.exercise.regions,rainbow.exercise.unicorns);
  valid(intersection.board.regions,[...intersection.board.unicorns,9]);
  valid(intersection.exercise.regions,[...intersection.exercise.unicorns,intersection.exercise.answer]);
  for(const lesson of directorLessons.filter(x=>!x.board.panels)){
    validateMap(lesson.board.regions,4);validateMap(lesson.exercise.regions,4);
    for(const state of [lesson.board,lesson.exercise]){
      assert.equal(state.regions.length,16);
      assert.ok(state.unicorns.every(i=>i>=0&&i<16));
      assert.ok(state.excluded.every(i=>!state.unicorns.includes(i)));
    }
    assert.ok(lesson.steps.length>0);
    if(lesson.exercise.answer!==undefined)assert.ok(!lesson.exercise.excluded.includes(lesson.exercise.answer));
  }
});
test('locked pair reserves exactly two rows and eliminates the third color there',()=>{
  const pair=lessons[1];
  const red=[4,8],orange=[5,9];
  assert.deepEqual([...new Set([...red,...orange].map(i=>Math.floor(i/4)))],[1,2]);
  assert.deepEqual(pair.steps[3].eliminated,[2,6,10]);
  assert.equal(Math.floor(pair.steps[4].placed[0]/4),3);
  assert.deepEqual([...new Set(pair.exercise.pairCandidates.map(i=>Math.floor(i/4)))],[0,2]);
  assert.equal(Math.floor(pair.exercise.answer/4),1);
});
test('rainbow exercise removes every other cell of its occupied connected region',()=>{
  const x=directorLessons[3].exercise,occupied=10,region=x.regions[occupied];
  assert.deepEqual(x.answers,[...x.regions.keys()].filter(i=>x.regions[i]===region&&i!==occupied));
});
test('intersection needs both column and rainbow elimination',()=>{
  const x=directorLessons[4].exercise;
  assert.deepEqual([...x.lineEliminated,...x.regionEliminated,x.answer].sort((a,b)=>a-b),[4,5,6,7]);
  assert.equal(x.regions[x.regionEliminated[0]],x.regions[11]);
  assert.ok(x.lineEliminated.every(i=>x.unicorns.some(j=>j%4===i%4)));
});
test('Across the Cube uses actual 7x7 shared physical cells and neighboring rows',()=>{
  const x=directorLessons[5];
  assert.equal(x.board.panels.length,2);
  for(const panel of x.board.panels)for(const cell of panel.cells)
    assert.equal(cell.id,topology.faceCellToPhysical(panel.face,cell.row,cell.col));
  const shared=topology.faceCellToPhysical('front',3,6);
  assert.deepEqual(topology.physicalToFaceCells(shared),[{face:'front',row:3,col:6},{face:'right',row:3,col:0}]);
  assert.deepEqual(x.steps[4].placedIds,[shared]);
  assert.deepEqual(x.steps[4].eliminatedRefs,Array.from({length:6},(_,i)=>`right:3:${i+1}`));
  const exercise=topology.faceCellToPhysical('front',4,6);
  assert.equal(exercise,topology.faceCellToPhysical('right',4,0));
  assert.deepEqual(x.exercise.unicorns,[exercise]);
  assert.equal(x.exercise.answer,'right:4:0');
});
