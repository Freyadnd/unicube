import {topology} from '../experiments/cube-topology/topology.mjs';
import {solve} from '../experiments/single-face/model.mjs';

export function clueOrder(board,t=topology) {
  const truth=[...board.truth].sort(), chosen=[], steps=[], faces=t.faces;
  const baseline=Object.fromEntries(faces.map(face=>[face,solve(board.maps[face])]));
  const refs=id=>t.physicalToFaceCells(id);
  const countsFor=(fixed)=>Object.fromEntries(faces.map(face=>[face,baseline[face].filter(p=>fixed.every(id=>{
    const local=refs(id).find(r=>r.face===face); return !local || p[local.row]===local.col;
  })).length]));
  let before=countsFor([]);
  for(let i=0;i<truth.length;i++) {
    let best=null;
    for(const id of truth) if(!chosen.includes(id)) {
      const after=countsFor([...chosen,id]);
      const contributions=Object.fromEntries(faces.map(face=>[face,before[face]===after[face]?0:Math.log2(before[face]/after[face])]));
      const gain=Object.values(contributions).reduce((a,b)=>a+b,0), improved=Object.values(contributions).filter(x=>x>0).length;
      const shared=refs(id).length;
      if(!best||gain>best.score+1e-12||Math.abs(gain-best.score)<=1e-12&&
        (shared>best.shared||shared===best.shared&&
          (improved>best.improved||improved===best.improved&&id<best.id)))
        best={id,score:gain,shared,improved,before,after,contributions,faces:refs(id)};
    }
    chosen.push(best.id); steps.push(best);
    before=best.after;
  }
  return {order:chosen,steps};
}

export function makeVariants(fixtures,t=topology) {
  const c=fixtures.C, ranking=clueOrder(c,t);
  return Object.fromEntries([
    ['A',fixtures.A,0],['B',fixtures.B,0],['C0',c,0],['C2',c,2],['C4',c,4],['C7',c,7],['D',fixtures.D,0]
  ].map(([id,board,n])=>[id,{id,maps:board.maps,truth:board.truth,fixed:ranking.order.slice(0,n),globalCount:board.globalCount,clueSteps:ranking.steps}]));
}
