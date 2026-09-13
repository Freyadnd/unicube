import {createTopology} from '../cube-topology/topology.mjs';
import {solve} from '../single-face/model.mjs';
export function localCount(board,face,required=board.fixed,excluded=board.excluded){
  const t=createTopology(board.n),yes=new Set(required),no=new Set(excluded);
  return solve(board.maps[face],t.n).filter(p=>{
    for(let r=0;r<t.n;r++)for(let c=0;c<t.n;c++){
      const id=t.faceCellToPhysical(face,r,c),u=p[r]===c;
      if(yes.has(id)&&!u||no.has(id)&&u)return false;
    }return true;
  }).length;
}
function units(board,t){return t.faces.flatMap(face=>['row','column','region'].flatMap(kind=>Array.from({length:t.n},(_,k)=>t.physicalCells.filter(cell=>cell.faceCells.some(r=>r.face===face&&(kind==='row'?r.row:kind==='column'?r.col:board.maps[face][r.row*t.n+r.col])===k)).map(c=>c.id))));}
export function propagation(board){
  const t=createTopology(board.n),all=units(board,t),yes=new Set(board.fixed),no=new Set(board.excluded);let rounds=0,forced=0;
  for(;;){let changes=0;for(const unit of all){const placed=unit.filter(id=>yes.has(id));if(placed.length){for(const id of unit)if(!yes.has(id)&&!no.has(id)){no.add(id);changes++;}}else{const remaining=unit.filter(id=>!no.has(id));if(remaining.length===1){yes.add(remaining[0]);changes++;forced++;}}}if(!changes)break;rounds++;}
  return {rounds,forced,solved:board.truth.every(id=>yes.has(id)),remainingUnicorns:board.truth.length-board.fixed.length};
}
