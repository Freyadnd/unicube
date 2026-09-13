import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createTopology} from '../experiments/cube-topology/topology.mjs';
import {validate} from '../experiments/complete-cube/model.mjs';
import {countGlobal} from '../experiments/rainbow-cube/model.mjs';
import {validateMap,validatePlacement,solve} from '../experiments/single-face/model.mjs';
import {localCount} from '../experiments/small-cubes/analyze.mjs';
import {makeCubeCampaign,openCampaignLevel,advanceCampaign} from '../src/levels.mjs';
import {cubeTutorial} from '../src/cube-tutorial.mjs';
import {setupRulesCard} from '../src/rules-card.mjs';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url)));
const cubes=read('../experiments/small-cubes/examples.json'),saved=read('../experiments/tutorial-levels/examples.json');
const levels=makeCubeCampaign(cubes,saved);

test('true cubes N=3,4,5,7 exhaustively preserve identities and all seam mappings',()=>{
  for(const n of [3,4,5,7]){
    const t=createTopology(n);
    assert.equal(t.physicalCells.length,6*(n-2)**2+12*(n-2)+8);
    assert.deepEqual([1,2,3].map(k=>t.physicalCells.filter(c=>c.faceCells.length===k).length),[6*(n-2)**2,12*(n-2),8]);
    assert.equal(t.physicalCells.reduce((s,c)=>s+c.faceCells.length,0),6*n*n);
    for(const face of t.faces)for(let row=0;row<n;row++)for(let col=0;col<n;col++){
      const refs=t.physicalToFaceCells(t.faceCellToPhysical(face,row,col));
      assert.ok(refs.some(r=>r.face===face&&r.row===row&&r.col===col));
      const boundaries=Number(row===0||row===n-1)+Number(col===0||col===n-1);
      assert.equal(refs.length,boundaries+1);
    }
    assert.equal(t.edges.length,12);
    for(const edge of t.edges){assert.equal(edge.interiorCells.length,n-2);for(let i=0;i<n;i++){
      const ref=t.mapEdge(edge.a.face,edge.a.side,i);
      assert.equal(t.faceCellToPhysical(ref.face,ref.row,ref.col),edge.cells[i]);
    }}
  }
});

test('saved true cubes have connected planted regions and exactly one solution with givens',()=>{
  for(const b of levels){
    const t=createTopology(b.n),v=validate(b.truth,t);assert.equal(v.valid,true);
    for(const f of t.faces){validateMap(b.maps[f],b.n);assert.equal(validatePlacement(b.maps[f],v.faces[f].permutation,b.n),true);}
    const result=countGlobal(b.maps,{t,required:b.fixed,excluded:b.excluded});
    assert.equal(result.count,1);assert.equal(result.exact,true);
    assert.deepEqual(result.solutions[0].sort(),[...b.truth].sort());
    assert.ok(b.fixed.every(id=>b.truth.includes(id)));assert.ok(b.excluded.every(id=>!b.truth.includes(id)));
  }
});

test('3x3 teaching exclusions each transfer real information to a different face',()=>{
  const b=levels[0],t=createTopology(3),yes=[...b.fixed],no=[...b.excluded];
  const proofFaces=['front','front','front','right','right','right','top'];
  for(const [i,step] of b.tutorial.entries()){
    // Every instructed action is forced in the stated face's independent domain.
    const face=proofFaces[i],ref=t.physicalToFaceCells(step.target).find(r=>r.face===face);
    const possibilities=solve(b.maps[face],3).filter(p=>{
      for(let r=0;r<3;r++)for(let c=0;c<3;c++){const id=t.faceCellToPhysical(face,r,c);if(yes.includes(id)&&p[r]!==c||no.includes(id)&&p[r]===c)return false;}return true;
    });
    assert.ok(possibilities.length>0);
    assert.ok(possibilities.every(p=>(p[ref.row]===ref.col)===(step.state===2)),step.proof);
    if(i===2)assert.equal(localCount(b,'right',yes,no),2);
    if(i===5)assert.equal(localCount(b,'top',yes,no),2);
    (step.state===2?yes:no).push(step.target);
    if(i===2)assert.equal(localCount(b,'right',yes,no),1);
    if(i===5)assert.equal(localCount(b,'top',yes,no),1);
  }
});

test('3x3 guided actions synchronize edge and corner, then finish in eight meaningful actions',()=>{
  const {board,player,topology:t}=openCampaignLevel(levels,0);
  for(const step of board.tutorial){assert.equal(cubeTutorial(board,id=>player.get(id)).target,step.target);player.set(step.target,step.state);
    for(const ref of t.physicalToFaceCells(step.target))assert.equal(player.get(t.faceCellToPhysical(ref.face,ref.row,ref.col)),step.state);
  }
  assert.equal(cubeTutorial(board,id=>player.get(id)).text,'your turn');
  const left=board.truth.filter(id=>player.get(id)!==2);assert.equal(left.length,1);player.set(left[0],2);assert.equal(player.evaluate().solved,true);
  assert.equal(board.tutorial.length+left.length,8);
});

test('four cube stages reset identity and givens across every Next transition',()=>{
  let current=openCampaignLevel(levels,0);
  for(const n of [3,4,5,7]){
    assert.equal(current.topology.n,n);assert.equal(current.board.activeFaces.length,6);
    assert.equal(current.player.canUndo,false);
    assert.deepEqual(current.player.marks().excluded.sort(),[...current.board.excluded].sort());
    for(const id of current.board.fixed){current.player.set(id,0);assert.equal(current.player.get(id),2);}
    for(const id of current.board.excluded){current.player.set(id,2);assert.equal(current.player.get(id),1);}
    const editable=current.board.truth.find(id=>!current.player.fixed.has(id));current.player.set(editable,2);current.player.set(editable,0);assert.equal(current.player.get(editable),0);
    current.player.reset();assert.ok(current.board.excluded.every(id=>current.player.get(id)===1));
    for(const id of current.board.truth)current.player.set(id,2);
    assert.equal(current.player.evaluate().solved,true);current=advanceCampaign(levels,current);
  }
});

test('first-launch Rules card shows Play, persists dismissal, and reopens without touching player',()=>{
  const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
  const dialog={open:false,showModal(){this.open=true;},close(){this.open=false;},addEventListener(){}};
  const button={},close={setAttribute(){}};
  setupRulesCard({dialog,button,close,storage,first:true});assert.equal(button.textContent,'Rules');assert.equal(dialog.open,true);assert.equal(close.textContent,'Play');
  close.onclick();assert.equal(dialog.open,false);setupRulesCard({dialog,button,close,storage,first:true});assert.equal(dialog.open,false);
  button.onclick();assert.equal(dialog.open,true);close.onclick();assert.equal(dialog.open,false);
});
