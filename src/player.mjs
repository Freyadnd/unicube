import {topology} from '../experiments/cube-topology/topology.mjs';
import {validateMap} from './region-map.mjs';
export const UNKNOWN=0,EXCLUDED=1,UNICORN=2;
export const leftClickState=state=>(state+1)%3;
export const rightClickState=state=>state===EXCLUDED?UNKNOWN:EXCLUDED;
export function createPlayer(maps,t=topology,fixed=[],activeFaces=t.faces,excluded=[]) {
  for(const face of activeFaces) validateMap(maps[face],t.n);
  const active=new Set(activeFaces); if([...active].some(face=>!t.faces.includes(face)))throw new Error('Unknown active face');
  const fixedSet=new Set(fixed),fixedExcluded=new Set(excluded),locked=new Set([...fixed,...excluded]);
  if(fixed.some(id=>fixedExcluded.has(id)))throw Error('Conflicting given states');
  const state=new Map(t.physicalCells.map(c=>[c.id,fixedSet.has(c.id)?UNICORN:fixedExcluded.has(c.id)?EXCLUDED:UNKNOWN])),history=[];
  const units=t.faces.filter(face=>active.has(face)).flatMap(face=>['row','column','region'].flatMap(kind=>Array.from({length:t.n},(_,index)=>({face,kind,index,
    cells:Array.from({length:t.n*t.n},(_,i)=>i).filter(i=>(kind==='row'?Math.floor(i/t.n):kind==='column'?i%t.n:maps[face][i])===index)
      .map(i=>t.faceCellToPhysical(face,Math.floor(i/t.n),i%t.n))}))));
  function get(id){if(!state.has(id))throw new Error('Unknown physical cell');return state.get(id);}
  function commit(changes){const patch=changes.filter(([id,value])=>!locked.has(id)&&get(id)!==value).map(([id,value])=>[id,get(id),value]);if(!patch.length)return;history.push(patch);patch.forEach(([id,,value])=>state.set(id,value));}
  function evaluate(){
    const contradictions=[];let allComplete=true;
    for(const unit of units){const placed=unit.cells.filter(id=>get(id)===UNICORN),possible=unit.cells.filter(id=>get(id)!==EXCLUDED);
      if(placed.length!==1)allComplete=false;
      if(placed.length>1)contradictions.push({...unit,reason:'multiple unicorns',involved:placed});
      else if(!possible.length)contradictions.push({...unit,reason:'no remaining cell',involved:unit.cells});
    }
    return {contradictions,solved:allComplete,placed:[...state.values()].filter(v=>v===UNICORN).length};
  }
  return {get,cycle(id){commit([[id,(get(id)+1)%3]]);},set(id,value){if(![UNKNOWN,EXCLUDED,UNICORN].includes(value))throw new Error('Invalid player state');commit([[id,value]]);},
    reset(){commit([...state.keys()].map(id=>[id,UNKNOWN]));},
    undo(){const patch=history.pop();if(patch)patch.forEach(([id,before])=>state.set(id,before));},
    get canUndo(){return history.length>0;},fixed:fixedSet,fixedExcluded,locked,evaluate,
    marks(){return {required:[...state].filter(([,v])=>v===UNICORN).map(([id])=>id),excluded:[...state].filter(([,v])=>v===EXCLUDED).map(([id])=>id)};},
    showSolution(truth){const answer=new Set(truth);if(!Array.isArray(truth)||answer.size!==truth.length||truth.some(id=>!state.has(id))||units.some(unit=>unit.cells.filter(id=>answer.has(id)).length!==1))throw Error('Invalid answer placement');commit([...state.keys()].map(id=>[id,answer.has(id)?UNICORN:EXCLUDED]));}
  };
}
