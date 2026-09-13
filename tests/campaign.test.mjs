import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeCampaign,openCampaignLevel,advanceCampaign} from '../src/levels.mjs';
import {countGlobal} from '../experiments/rainbow-cube/model.mjs';
import {solve} from '../experiments/single-face/model.mjs';
import {createT1Presentation} from '../src/celestial-guide.mjs';
import {regionLines,makeRenderFrames} from '../src/renderer3d.mjs';
const read=name=>JSON.parse(readFileSync(new URL(`../experiments/tutorial-levels/${name}.json`,import.meta.url)));
const levels=makeCampaign(read('small'),read('examples'));

test('campaign uses seven saved unique stages with matching active truth',()=>{
  assert.deepEqual(levels.map(l=>l.n),[3,4,5,7,7,7,7]);
  assert.deepEqual(levels.map(l=>l.activeFaces.length),[1,1,1,1,2,3,6]);
  for(let i=0;i<levels.length;i++){
    const {board,topology:t,player}=openCampaignLevel(levels,i);
    if(t.n<7){assert.equal(solve(board.maps.front,t.n).length,1);}
    else {
      const result=countGlobal(board.maps,{activeFaces:board.activeFaces,required:board.fixed});
      assert.equal(result.exact,true,board.id);assert.equal(result.count,1,board.id);
      assert.deepEqual(result.solutions[0].sort(),[...board.truth].sort(),board.id);
    }
    assert.ok(board.fixed.every(id=>board.truth.includes(id)));
    for(const id of board.truth)player.set(id,2);
    assert.equal(player.evaluate().solved,true,board.id);
  }
});

test('normal Next construction traverses every transition and clears undo/state',()=>{
  let current=openCampaignLevel(levels,0);
  for(let i=0;i<7;i++){
    assert.equal(current.index,i);assert.equal(current.board.id,`T${i+1}`);
    assert.equal(current.player.canUndo,false);
    assert.equal(advanceCampaign(levels,current),current,'unsolved level cannot advance');
    for(const id of current.board.truth)current.player.set(id,2);
    assert.equal(current.player.evaluate().solved,true);
    const next=advanceCampaign(levels,current);
    if(i===6)assert.equal(next,current);else {
      assert.notEqual(next.player,current.player);
      assert.deepEqual(next.player.marks().excluded,[]);
      assert.deepEqual([...next.player.marks().required].sort(),[...next.board.fixed].sort());
    }
    current=next;
  }
});

test('edge and corner highlights refer to one editable shared identity',()=>{
  for(const [i,faces,id] of [[4,['front','right'],'6,2,6'],[5,['front','right','top'],'6,6,6']]){
    const {board,topology:t,player}=openCampaignLevel(levels,i);
    assert.deepEqual(board.activeFaces,faces);assert.equal(board.shared,id);
    const refs=t.physicalToFaceCells(id).filter(r=>faces.includes(r.face));
    assert.equal(refs.length,faces.length);assert.equal(player.fixed.has(id),false);
    for(const state of [1,0,2,0]){player.set(id,state);for(const r of refs)assert.equal(player.get(t.faceCellToPhysical(r.face,r.row,r.col)),state);}
    for(const fixed of board.fixed){player.set(fixed,0);assert.equal(player.get(fixed),2);}
    player.reset();assert.ok(board.fixed.every(id=>player.get(id)===2));
  }
});

test('inactive faces do not affect completed campaign stages',()=>{
  for(let i=0;i<6;i++){
    const {board,topology:t,player}=openCampaignLevel(levels,i);
    for(const id of board.truth)player.set(id,2);
    for(const cell of t.physicalCells)if(cell.faceCells.every(r=>!board.activeFaces.includes(r.face)))player.set(cell.id,2);
    assert.equal(player.evaluate().solved,true,board.id);
  }
});

test('T1 copy advances through short state-driven messages',()=>{
  const present=createT1Presentation(),state=Array(9).fill(0),get=i=>state[i];
  assert.equal(present(get,0).text,'one 🦄 in every rainbow');
  assert.equal(present(get,1700).text,'not here');
  state[3]=1;assert.equal(present(get,1800).text,'not here');
  state[4]=1;assert.equal(present(get,1900).text,'only one star left');
  assert.equal(present(get,3100).text,'double-tap it');
  state[5]=2;assert.equal(present(get,3200).text,'one 🦄 per row');
  assert.equal(present(get,4700).text,'your turn');
});

test('7x7 region grid omits every internal same-region separator',()=>{
  const {topology:t}=openCampaignLevel(levels,3),f=makeRenderFrames(t).front;
  const same=Array(49).fill(0),outer=regionLines(f,same,7);
  assert.equal(outer.length,28*6);
  const split=same.map((v,i)=>i%7<3?0:1);
  assert.equal(regionLines(f,split,7).length,35*6);
});
