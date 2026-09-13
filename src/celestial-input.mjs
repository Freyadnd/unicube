// One pointer owner; drag classification is sticky until release.
export function createGesture({pick,click,rotate,now=()=>performance.now(),double=true}) {
  let down=null,last=null;
  return {
    get idle(){return down===null;},
    start(e){if(down||e.button>0)return false;down={id:e.pointerId,x:e.clientX,y:e.clientY,cell:pick(e.clientX,e.clientY),drag:false};return true;},
    move(e){if(!down||down.id!==e.pointerId)return;const dx=e.clientX-down.x,dy=e.clientY-down.y;if(Math.hypot(dx,dy)>5)down.drag=true;if(down.drag){last=null;rotate(dx,dy);} },
    end(e){if(!down||down.id!==e.pointerId)return;this.move(e);const d=down;down=null;if(d.drag){last=null;return;}const cell=pick(e.clientX,e.clientY);if(cell==null||cell!==d.cell){last=null;return;}const time=now(),twice=double&&last?.cell===cell&&time-last.time<320;click(cell,twice?'double':'single');last=twice?null:{cell,time};},
    cancel(){down=null;last=null;}
  };
}
export function celestialState(state,action){return action==='double'?(state===2?0:2):(state===2?2:1-state);}
