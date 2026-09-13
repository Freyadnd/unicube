import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createTopology} from '../experiments/cube-topology/topology.mjs';
import {createPlayer} from '../src/player.mjs';
import {makeCubeCampaign,openCampaignLevel} from '../src/levels.mjs';
import {availableHints,findHint,faceProgress,campaignProgress} from '../src/play-assist.mjs';
import {cameraTarget,frontFacing,dragPitch} from '../src/face-camera.mjs';
import {makeRenderFrames} from '../src/renderer3d.mjs';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url)));
const levels=makeCubeCampaign(read('../experiments/small-cubes/examples.json'),read('../experiments/tutorial-levels/examples.json'));

test('campaign progress and configured starting footholds',()=>{
  assert.deepEqual(levels.map(l=>l.startFace),['front','top','back','left']);
  for(let i=0;i<4;i++){
    const p=campaignProgress(levels,i,i),c=openCampaignLevel(levels,i);
    assert.deepEqual(p.map(x=>x.n),[3,4,5,7]);assert.equal(p.filter(x=>x.complete).length,i);assert.equal(p[i].current,true);
    assert.ok(availableHints(c.board,c.topology,c.player).some(h=>h.face===c.board.startFace&&h.type==='single'));
  }
});
test('six face counts count shared representations, and completion checks constraints',()=>{
  const {board,topology:t,player}=openCampaignLevel(levels,1);
  assert.deepEqual(faceProgress(board,t,player).map(f=>f.placed),[2,2,2,3,2,3]);
  for(const id of board.truth)player.set(id,2);
  assert.ok(faceProgress(board,t,player).every(f=>f.placed===4&&f.complete));
  const removable=board.truth.find(id=>!player.fixed.has(id));player.set(removable,0);
  for(const ref of t.physicalToFaceCells(removable))assert.equal(faceProgress(board,t,player).find(f=>f.face===ref.face).complete,false);
});
test('local hint rules detect singles and satisfied row/column/rainbow without truth or edits',()=>{
  const t=createTopology(3),map=[0,0,0,0,0,2,0,1,1],board={maps:{front:map},activeFaces:['front']};
  Object.defineProperty(board,'truth',{get(){throw Error('Hints may not read truth');}});
  const p=createPlayer(board.maps,t,[],board.activeFaces);
  assert.equal(findHint(board,t,p,'front').type,'single');
  p.set(t.faceCellToPhysical('front',0,0),2);
  const before=p.marks(),hints=availableHints(board,t,p);
  for(const type of ['row','column','region','single'])assert.ok(hints.some(h=>h.type===type));
  const hint=findHint(board,t,p,'front');assert.equal(hint.type,'single');
  assert.deepEqual(p.marks(),before);
  assert.equal(hint.face,'front');assert.ok(hint.targets.every(id=>p.get(id)===0));
});
test('hint selection prefers the visible face before applying rule priority',()=>{
  const c=openCampaignLevel(levels,2),hints=availableHints(c.board,c.topology,c.player);
  for(const face of c.board.activeFaces){const local=hints.filter(h=>h.face===face);if(!local.length)continue;
    const h=findHint(c.board,c.topology,c.player,face);assert.equal(h.face,face);assert.equal(h.rank,Math.min(...local.map(x=>x.rank)));
  }
});
test('face camera targets orient every verified face and preserve grab-direction pitch',()=>{
  const frames=makeRenderFrames(createTopology(7));
  for(const face of Object.keys(frames)){const target=cameraTarget(face,7);assert.equal(frontFacing(frames,target.x,target.y),face);assert.ok(Math.abs(target.y-7)<=Math.PI);}
  // At a front view, projected front-center screen Y varies with +sin(pitch).
  assert.ok(Math.sin(dragPitch(0,-10))<0,'upward drag moves the front center upward');
  assert.ok(Math.sin(dragPitch(0,10))>0);
  assert.ok(dragPitch(0,-10,true)>0);
});
