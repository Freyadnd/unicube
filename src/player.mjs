import {topology} from '../experiments/cube-topology/topology.mjs';
import {validateBoard} from '../experiments/rainbow-cube/model.mjs';
export const UNKNOWN=0,EXCLUDED=1,UNICORN=2;
export function createPlayer(maps,t=topology,fixed=[]) {
  validateBoard(maps,null,t);
  const fixedSet=new Set(fixed); const state=new Map(t.physicalCells.map(c=>[c.id,fixedSet.has(c.id)?UNICORN:UNKNOWN])),history=[];
  const units=t.faces.flatMap(face=>['row','column','region'].flatMap(kind=>Array.from({length:t.n},(_,index)=>({face,kind,index,
    cells:Array.from({length:t.n*t.n},(_,i)=>i).filter(i=>(kind==='row'?Math.floor(i/t.n):kind==='column'?i%t.n:maps[face][i])===index)
      .map(i=>t.faceCellToPhysical(face,Math.floor(i/t.n),i%t.n))}))));
  function get(id){if(!state.has(id))throw new Error('Unknown physical cell');return state.get(id);}
  function commit(changes){const patch=changes.filter(([id,value])=>!fixedSet.has(id)&&get(id)!==value).map(([id,value])=>[id,get(id),value]);if(!patch.length)return;history.push(patch);patch.forEach(([id,,value])=>state.set(id,value));}
  function evaluate(){
    const contradictions=[];let allComplete=true;
    for(const unit of units){const placed=unit.cells.filter(id=>get(id)===UNICORN),possible=unit.cells.filter(id=>get(id)!==EXCLUDED);
      if(placed.length!==1)allComplete=false;
      if(placed.length>1)contradictions.push({...unit,reason:'multiple unicorns',involved:placed});
      else if(!possible.length)contradictions.push({...unit,reason:'no remaining cell',involved:unit.cells});
    }
    return {contradictions,solved:allComplete,placed:[...state.values()].filter(v=>v===UNICORN).length};
  }
  return {get,cycle(id){commit([[id,(get(id)+1)%3]]);},
    reset(){commit([...state.keys()].map(id=>[id,UNKNOWN]));},
    undo(){const patch=history.pop();if(patch)patch.forEach(([id,before])=>state.set(id,before));},
    get canUndo(){return history.length>0;},fixed:fixedSet,evaluate,
    marks(){return {required:[...state].filter(([,v])=>v===UNICORN).map(([id])=>id),excluded:[...state].filter(([,v])=>v===EXCLUDED).map(([id])=>id)};},
    showSolution(truth){validateBoard(maps,truth,t);const answer=new Set(truth);commit([...state.keys()].map(id=>[id,answer.has(id)?UNICORN:EXCLUDED]));}
  };
}
