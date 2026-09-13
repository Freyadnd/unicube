import {unitCells} from './play-assist.mjs';
// Authored offline against the saved cube. No deduction search runs here.
export function cubeTutorial(board,get,t=null){
  const steps=board.tutorial||[],index=steps.findIndex(step=>get(step.target)!==step.state);
  if(index<0)return {key:'finished',text:steps.length?'your turn':board.message||'',physical:[]};
  const step=steps[index];
  let physical=step.unit;
  if(t){
    const units=[['front','column',1],['front','region',board.maps.front[4]],['front','row',1],['right','row',1],['right','row',2],['right','column',0],['top','row',2]];
    const [face,kind,i]=units[index];physical=unitCells(t,board.maps,face,kind,i);
    if(index===4)physical=[...new Set([...physical,...unitCells(t,board.maps,'right','column',1)])];
  }
  return {...step,key:index,physical,targetsPhysical:[step.target]};
}
