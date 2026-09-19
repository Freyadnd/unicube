import {lessons} from './lesson-data.mjs';

const colorNames=['red','orange','yellow','green'];
export function createLessonGuide({dialog,entry,lessons:items=lessons}){
  let lesson=0,step=0,exercise=false,won=false,attempt=null,found=new Set();
  const shell=document.createElement('div');shell.className='lesson-shell';dialog.append(shell);
  function reset(i=lesson){lesson=i;step=0;exercise=false;won=false;attempt=null;found=new Set();draw();}
  function draw(){
    const data=items[lesson],state=exercise?data.exercise:data.board,frame=exercise?data.exercise:data.steps[step],cube=!!state.panels;
    const answers=exercise?(state.answers||[state.answer]):[];
    dialog.classList.toggle('is-cube',cube);
    dialog.classList.toggle('is-directors',items.length>2);
    shell.replaceChildren();
    const head=document.createElement('header');head.className='lesson-head';
    const title=document.createElement('h2');title.textContent=data.title;
    const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','Close tutorial');close.onclick=()=>dialog.close();head.append(title,close);shell.append(head);
    const tabs=document.createElement('nav');tabs.className='lesson-tabs';tabs.setAttribute('aria-label','Tutorial progression');
    items.forEach((item,i)=>{const b=document.createElement('button');b.type='button';b.textContent=items.length>2?`${i+1}  ${item.title}`:item.title;b.setAttribute('aria-current',i===lesson?'true':'false');b.classList.toggle('is-final',!!item.final);b.onclick=()=>reset(i);tabs.append(b);});shell.append(tabs);
    const caption=document.createElement('p');caption.className='lesson-caption';caption.setAttribute('role','status');caption.textContent=won?state.success:attempt!==null?'Try another spot.':frame.caption;shell.append(caption);
    const layout=document.createElement('div');layout.className=cube?'lesson-face-layout':'lesson-face-layout is-flat';
    const panels=state.panels||[{face:'',n:4,regions:state.regions,cells:Array.from({length:16},(_,i)=>({row:Math.floor(i/4),col:i%4,id:i}))}];
    const counts=new Map();for(const panel of panels)for(const cell of panel.cells)counts.set(cell.id,(counts.get(cell.id)||0)+1);
    for(const panel of panels){
      const wrapper=document.createElement('section');wrapper.className='lesson-face-panel';
      if(cube){const label=document.createElement('h3');label.textContent=panel.face;wrapper.append(label);}
      const grid=document.createElement('div');grid.className='lesson-grid';grid.style.setProperty('--lesson-n',panel.n);
      grid.setAttribute('role','group');grid.setAttribute('aria-label',`${data.title} ${panel.face||'example'} board`);
      panel.cells.forEach(({row,col,id},i)=>{
        const key=cube?`${panel.face}:${row}:${col}`:i,region=cube?panel.region:state.regions[i],cell=document.createElement('button');
        const line=(frame.lineEliminated||[]).includes(i),rainbow=(frame.regionEliminated||[]).includes(i);
        const eliminated=line||rainbow||(frame.eliminated||[]).includes(i)||(frame.eliminatedRefs||[]).includes(key)||(won&&state.successEliminatedRefs||[]).includes(key)||state.excluded.includes(id)||found.has(key);
        const placed=state.unicorns.includes(id)&&(!cube||won||!(state.hiddenFaces||[]).includes(panel.face))||(frame.placed||[]).includes(i)||(frame.placedIds||[]).includes(id)||won&&state.mode!=='eliminate'&&answers.includes(key);
        cell.type='button';cell.className='lesson-cell';cell.style.setProperty('--lesson-color',`var(--lesson-${region})`);
        cell.setAttribute('aria-label',`${panel.face?panel.face+' ':''}row ${row+1}, column ${col+1}${cube?counts.get(id)>1?', shared edge cell':'':`, ${colorNames[region]} rainbow`}`);
        cell.classList.toggle('is-region',(frame.regions||frame.highlightRegions||[]).includes(region));
        cell.classList.toggle('is-row',(frame.rows||[]).includes(row));
        cell.classList.toggle('is-column',(frame.columns||[]).includes(col));
        cell.classList.toggle('is-shared',cube&&counts.get(id)>1);
        cell.classList.toggle('is-candidate',(frame.candidates||[]).includes(i));
        cell.classList.toggle('is-pair',(frame.pairCandidates||[]).includes(i));
        cell.classList.toggle('is-eliminated',eliminated);
        cell.classList.toggle('is-line-out',line);
        cell.classList.toggle('is-rainbow-out',rainbow);
        cell.classList.toggle('is-focus',(frame.focus||[]).includes(i)||(frame.focusIds||[]).includes(id)||(frame.focusRefs||[]).includes(key));
        cell.classList.toggle('is-wrong',attempt===key&&!won);
        cell.classList.toggle('is-correct',won&&answers.includes(key));
        cell.textContent=placed?'🦄':eliminated?'×':(frame.candidates||[]).includes(i)||(frame.pairCandidates||[]).includes(i)?'✦':'';
        cell.disabled=!exercise||won;
        cell.onclick=()=>{if(answers.includes(key)){found.add(key);won=answers.every(answer=>found.has(answer));attempt=null;}else attempt=key;draw();};grid.append(cell);
      });
      wrapper.append(grid);layout.append(wrapper);
    }
    shell.append(layout);
    const foot=document.createElement('div');foot.className='lesson-controls';
    const back=document.createElement('button');back.type='button';back.textContent='Back';back.disabled=!exercise&&step===0;back.onclick=()=>{if(exercise){exercise=false;step=data.steps.length-1;}else step--;won=false;attempt=null;found=new Set();draw();};
    const next=document.createElement('button');next.type='button';next.textContent=won?(lesson<items.length-1?'Next lesson':'Replay'):exercise?'Replay':step===data.steps.length-1?'Your turn':'Next';next.onclick=()=>{if(won)reset(lesson<items.length-1?lesson+1:lesson);else if(exercise)reset();else{if(step===data.steps.length-1)exercise=true;else step++;attempt=null;draw();}};
    const skip=document.createElement('button');skip.type='button';skip.textContent='Skip';skip.onclick=()=>dialog.close();
    const count=document.createElement('span');count.textContent=exercise?state.answers?`${found.size} / ${answers.length}`:'Try it':`${step+1} / ${data.steps.length}`;
    foot.append(back,count,next,skip);shell.append(foot);
  }
  entry.onclick=()=>{reset(0);dialog.showModal();};
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
  return {open:()=>entry.click()};
}
