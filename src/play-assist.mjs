// Local, one-step deductions only. No truth lookup, recursion, or search.
export function unitCells(t,maps,face,kind,index){
  return Array.from({length:t.n*t.n},(_,i)=>i).filter(i=>(kind==='row'?Math.floor(i/t.n):kind==='column'?i%t.n:maps[face][i])===index)
    .map(i=>t.faceCellToPhysical(face,Math.floor(i/t.n),i%t.n));
}
export function faceProgress(board,t,player){
  return board.activeFaces.map(face=>{
    const units=['row','column','region'].flatMap(kind=>Array.from({length:t.n},(_,i)=>unitCells(t,board.maps,face,kind,i)));
    const placed=Array.from({length:t.n*t.n},(_,i)=>player.get(t.faceCellToPhysical(face,Math.floor(i/t.n),i%t.n))).filter(s=>s===2).length;
    return {face,placed,required:t.n,complete:units.every(cells=>cells.filter(id=>player.get(id)===2).length===1)};
  });
}
export function campaignProgress(levels,index,highest){
  return levels.map((level,i)=>({n:level.n,current:i===index,complete:i<highest}));
}
export function availableHints(board,t,player){
  if(player.evaluate().contradictions.length)return [];
  const units=board.activeFaces.flatMap(face=>['row','column','region'].flatMap(kind=>Array.from({length:t.n},(_,i)=>({face,kind,cells:unitCells(t,board.maps,face,kind,i)}))));
  const blocked=new Set();
  for(const u of units)if(u.cells.some(id=>player.get(id)===2))u.cells.forEach(id=>{if(player.get(id)!==2)blocked.add(id);});
  const hints=[];
  for(const u of units){
    const placed=u.cells.filter(id=>player.get(id)===2),possible=u.cells.filter(id=>player.get(id)===0),legal=possible.filter(id=>!blocked.has(id));
    if(!placed.length&&legal.length===1)hints.push({...u,type:'single',rank:0,targets:legal,text:'only one star left'});
    else if(placed.length===1&&possible.length)hints.push({...u,type:u.kind,rank:{row:1,column:2,region:3}[u.kind],targets:possible,text:`this ${u.kind==='region'?'rainbow':u.kind} already has its 🦄`});
  }
  return hints;
}
export function findHint(board,t,player,frontFace){
  const hints=availableHints(board,t,player),local=hints.filter(h=>h.face===frontFace);
  return (local.length?local:hints).sort((a,b)=>a.rank-b.rank)[0]||null;
}
