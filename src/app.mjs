import {findHint,faceProgress,campaignProgress} from './play-assist.mjs';
import {cubeTutorial} from './cube-tutorial.mjs';
import {setupRulesCard} from './rules-card.mjs';
import {celestialState} from './celestial-input.mjs';
import {createT1Presentation} from './celestial-guide.mjs';
import {topology as t} from '../experiments/cube-topology/topology.mjs';
import {createPlayer,leftClickState,rightClickState} from './player.mjs';
import {createRenderer} from './renderer3d.mjs';
import {createProgress,makeCampaign,makeCubeCampaign,openCampaignLevel,advanceCampaign} from './levels.mjs';
const $=id=>document.getElementById(id), params=new URLSearchParams(location.search),devMode=params.has('dev'),legacy=params.get('dev-campaign')==='legacy';
document.body.classList.toggle('dev-mode',devMode);
const labels='ROYGBIV',names=['Red','Orange','Yellow','Green','Blue','Indigo','Violet'];
try {
  async function fixture(path){const response=await fetch(path);if(!response.ok)throw Error(`Could not load ${path}`);return response.json();}
  const [fixtureData,small,saved,cubes]=await Promise.all([
    fixture('/experiments/rainbow-cube/examples.json'),fixture('/experiments/tutorial-levels/small.json'),fixture('/experiments/tutorial-levels/examples.json'),legacy?null:fixture('/experiments/small-cubes/examples.json')
  ]);
  let storage=null;try{storage=globalThis.localStorage;}catch{}
  const progress=createProgress(storage),levels=legacy?makeCampaign(small,saved):makeCubeCampaign(cubes,saved),selector=$('variant'),buttons=[];
  // Ranking and exhaustive counts are development tools, never normal gameplay.
  const variants=devMode?(await import('./variants.mjs')).makeVariants(fixtureData):{};
  const requested=Number(params.get('dev-act')),startIndex=!legacy&&[3,4,5,7].includes(requested)?levels.findIndex(l=>l.n===requested):0;
  let current=openCampaignLevel(levels,startIndex),board=current.board,logicTopology=current.topology,player=current.player;
  let renderer,worker,timer,revision=0,presentation=createT1Presentation(),sharedUntil=0,sharedId=null,activeHint=null,currentFace=board.startFace||'front';
  const faceButtons=new Map();
  const celestial=()=>!devMode;
  function guide(){
    if(activeHint){const ready=performance.now()-activeHint.started>900;return {text:ready?activeHint.text:`look at this ${activeHint.kind==='region'?'rainbow':activeHint.kind}`,face:activeHint.face,physical:activeHint.cells||[],targetsPhysical:ready?activeHint.targets:[]};}
    if(!legacy&&current.index>=0)return cubeTutorial(board,id=>player.get(id),logicTopology);
    if(board.id==='T1')return presentation(i=>player.get(logicTopology.faceCellToPhysical('front',Math.floor(i/3),i%3)),performance.now());
    return {text:board.message||'',physical:performance.now()<sharedUntil&&sharedId?[sharedId]:[]};
  }
  function updateRules(){
    const edge=board.activeFaces.length>1&&(board.id!=='U3'||player.get(board.tutorial[2].target)===1);
    const corner=board.activeFaces.length>1&&(board.id!=='U3'||player.get(board.tutorial[5].target)===1);
    $('rules-copy').innerHTML='✦ possible<br>· ruled out<br>🦄 unicorn<br><br>tap — rule out / restore<br>double-tap — place / remove 🦄<br>drag — rotate<br><br>1 🦄 per row<br>1 🦄 per column<br>1 🦄 per rainbow'+(edge?'<br>edges are shared':'')+(corner?'<br>corners are shared':'');
  }
  function updateStatus(){
    const e=player.evaluate();
    $('status').textContent=devMode?(e.solved?'Solved!':e.contradictions.length?`${e.contradictions.length} contradiction(s).`:'No rule contradictions detected.'):(e.solved?'Perfect.':guide().text);
    $('status').className=e.solved?'solved':devMode&&e.contradictions.length?'error':'';
  }
  function updateNavigation(){
    for(const f of faceProgress(board,logicTopology,player)){const b=faceButtons.get(f.face);if(!b)continue;b.count.textContent=`${f.placed}/${f.required}`;b.classList.toggle('complete',f.complete);b.classList.toggle('front-facing',f.face===currentFace);b.setAttribute('aria-pressed',f.face===currentFace);b.setAttribute('aria-label',`${f.face}: ${f.placed} of ${f.required}${f.complete?', complete':''}`);}
    $('campaign-progress').replaceChildren(...campaignProgress(levels,current.index,Math.min(levels.length,progress.highest)).map(p=>{const span=document.createElement('span');span.textContent=p.n;span.classList.toggle('current',p.current);span.classList.toggle('complete',p.complete);if(p.current)span.setAttribute('aria-current','step');return span;}));
  }
  function setupNavigation(){
    faceButtons.clear();$('face-nav').replaceChildren();
    for(const face of board.activeFaces){const b=document.createElement('button');b.type='button';const label=document.createElement('span');label.textContent=face[0].toUpperCase()+face.slice(1);b.count=document.createElement('span');b.append(label,b.count);b.onclick=()=>{activeHint=null;renderer.faceTo(face);render();};faceButtons.set(face,b);$('face-nav').append(b);}
  }
  function setupRenderer(){
    renderer?.dispose();presentation=createT1Presentation();sharedId=board.shared;sharedUntil=performance.now()+3200;
    document.body.classList.toggle('celestial',celestial());document.body.classList.toggle('campaign-ui',celestial()&&!legacy);setupNavigation();
    document.querySelector('.celestial-title').textContent=board.title||board.id;
    updateRules();
    if(celestial()&&board.id==='T1'&&params.get('state-preview')==='1')for(const [i,state] of [[3,1],[4,1],[5,2]])player.set(logicTopology.faceCellToPhysical('front',Math.floor(i/3),i%3),state);
    renderer=createRenderer($('cube'),{
      startFace:board.startFace,invertY:params.get('invertY')==='1',onFocusFace:face=>{currentFace=face;updateNavigation();},celestial:celestial(),campaign:celestial(),reveal:celestial()&&board.id==='T5',guidance:()=>celestial()?guide():null,
      topology:logicTopology,maps:board.maps,activeFaces:board.activeFaces,player,overlay:$('emoji-overlay'),
      diagnostic:devMode&&params.has('geometry-diagnostic'),onInput:d=>{$('input-debug').textContent=d.text;},
      onPick:(id,button,action)=>{
        if(player.locked.has(id))return;activeHint=null;
        const state=player.get(id);player.set(id,celestial()?celestialState(state,action):button===2?rightClickState(state):leftClickState(state));
        if(board.shared&&logicTopology.physicalToFaceCells(id).filter(r=>board.activeFaces.includes(r.face)).length>1){sharedId=id;sharedUntil=performance.now()+900;}
        render();
      },onHover:id=>{if(id&&devMode)info(id);},onError:error=>{$('status').textContent=error;$('status').className='error';}
    });
  }
  function install(next){
    activeHint=null;current=next;board=next.board;logicTopology=next.topology;player=next.player;
    clearTimeout(timer);worker?.terminate();worker=null;revision++;
    $('compatible').textContent='Open this panel to calculate';$('input-debug').textContent='input: waiting';$('cell-info').textContent='';
    buttons.length=0;$('net').replaceChildren();renderBoard();setupRenderer();view('3d');render();
  }
  function setLevel(i){install(openCampaignLevel(levels,i));}
  function renderBoard(){if(!devMode)return;for(const face of board.activeFaces){
    const section=document.createElement('section');section.className='face';section.style.setProperty('--face',face);
    const h=document.createElement('h2');h.textContent=face;const grid=document.createElement('div');grid.className='grid';grid.style.gridTemplateColumns=`repeat(${logicTopology.n},var(--cell))`;
    section.append(h,grid);$('net').append(section);
    for(let row=0;row<logicTopology.n;row++)for(let col=0;col<logicTopology.n;col++){
      const id=logicTopology.faceCellToPhysical(face,row,col),region=board.maps[face][row*logicTopology.n+col],b=document.createElement('button');
      b.type='button';b.className='cell';b.dataset.physical=id;b.dataset.description=`${face}, row ${row+1}, column ${col+1}, ${names[region]} region`;
      b.style.setProperty('--color',`var(--${labels[region]})`);b.style.setProperty('--ink',region===5?'white':'#181820');
      b.classList.toggle('region-right',col===logicTopology.n-1||board.maps[face][row*logicTopology.n+col+1]!==region);
      b.classList.toggle('region-bottom',row===logicTopology.n-1||board.maps[face][(row+1)*logicTopology.n+col]!==region);
      b.addEventListener('click',()=>{if(!player.fixed.has(id)){player.cycle(id);render();}info(id);});
      b.addEventListener('pointerenter',()=>info(id));b.addEventListener('focus',()=>info(id));buttons.push(b);grid.append(b);
    }
  }}
  function info(id){$('cell-info').textContent=logicTopology.physicalToFaceCells(id).map(r=>`${r.face} r${r.row+1}c${r.col+1}`).join(' ↔ ');buttons.forEach(b=>b.classList.toggle('linked',b.dataset.physical===id));}
  function requestCount(){
    clearTimeout(timer);if(!devMode||!$('developer').open)return;
    $('compatible').textContent='Calculating…';timer=setTimeout(()=>{
      if(!worker){worker=new Worker(new URL('./solver-worker.mjs',import.meta.url),{type:'module'});worker.onmessage=({data})=>{if(data.revision!==revision)return;$('compatible').textContent=data.error?'Unavailable':data.exact?data.count:`At least ${data.count}`;};}
      worker.postMessage({revision,maps:board.maps,n:logicTopology.n,activeFaces:board.activeFaces,marks:player.marks()});
    },80);
  }
  function render(){
    const e=player.evaluate(),bad=new Set(e.contradictions.flatMap(c=>c.involved));
    $('cube-wrap').classList.toggle('solved',e.solved);if(e.solved&&!devMode)progress.complete(current.index+1);
    for(const b of buttons){const id=b.dataset.physical,s=player.get(id);b.textContent=player.fixed.has(id)?'◆':['','×','★'][s];b.dataset.state=player.fixed.has(id)?'fixed':['unknown','excluded','unicorn'][s];b.classList.toggle('fixed',player.fixed.has(id));b.classList.toggle('conflict',bad.has(id));b.setAttribute('aria-label',`${b.dataset.description}: ${b.dataset.state}`);}
    $('undo').disabled=!player.canUndo;$('reset').disabled=!player.marks().excluded.some(id=>!player.fixedExcluded.has(id))&&player.marks().required.every(id=>player.fixed.has(id));
    $('next-level').hidden=!e.solved||current.index<0||current.index===levels.length-1;
    $('level-indicator').textContent=current.index>=0?`${current.index+1} / ${levels.length}`:'';
    $('contradictions').replaceChildren(...e.contradictions.map(c=>{const li=document.createElement('li');li.textContent=`${c.face}: ${c.kind} ${c.index+1} — ${c.reason}.`;return li;}));
    $('selected').textContent=board.id;$('fixed-count').textContent=board.fixed.length;$('placed').textContent=player.marks().required.filter(id=>!player.fixed.has(id)).length;$('dev-conflict').textContent=e.contradictions.length?'Yes':'No';
    updateNavigation();updateRules();updateStatus();revision++;requestCount();
  }
  function view(mode){$('cube-wrap').style.display=mode==='3d'?'block':'none';$('net-scroll').style.display=mode==='2d'?'block':'none';for(const m of ['3d','2d']){$(`view-${m}`).classList.toggle('view-active',mode===m);$(`view-${m}`).setAttribute('aria-pressed',mode===m);}}
  if(devMode){
    for(const [value,title] of [...levels.map((l,i)=>[`level:${i}`,l.title]),...Object.keys(variants).map(id=>[id,id==='D'?'D (debug / ambiguous)':id])]){const o=document.createElement('option');o.value=value;o.textContent=title;selector.append(o);}
    selector.value='level:0';selector.onchange=()=>{if(selector.value.startsWith('level:'))setLevel(Number(selector.value.slice(6)));else {const b=variants[selector.value];b.activeFaces??=t.faces;install({index:-1,board:b,topology:t,player:createPlayer(b.maps,t,b.fixed,b.activeFaces)});}};
    names.forEach((name,i)=>{const span=document.createElement('span');span.className='swatch';span.style.setProperty('--color',`var(--${labels[i]})`);span.textContent=`${labels[i]} · ${name}`;$('legend').append(span);});
  }
  $('next-level').onclick=()=>{const next=advanceCampaign(levels,current);if(next!==current)install(next);};
  $('rules-button').textContent='Rules';$('rules-button').setAttribute('aria-label','Rules');
  
  $('view-3d').onclick=()=>view('3d');$('view-2d').onclick=()=>view('2d');
  $('undo').onclick=()=>{activeHint=null;player.undo();render();};$('reset').onclick=()=>{activeHint=null;player.reset();presentation=createT1Presentation();render();};
  $('hint-button').onclick=()=>{
    const hint=findHint(board,logicTopology,player,renderer.frontFace);
    activeHint=hint?{...hint,started:performance.now()}:{text:'no simple hint yet',kind:'face',cells:[],targets:[],started:-Infinity};
    for(const [face,b] of faceButtons)b.classList.toggle('hinted',face===hint?.face);
    if(hint&&hint.face!==renderer.frontFace)renderer.faceTo(hint.face);
    updateStatus();
  };
  $('developer').addEventListener('toggle',requestCount);
  $('show-solution').onclick=()=>{const truth=new Set(board.truth);for(const cell of logicTopology.physicalCells)player.set(cell.id,truth.has(cell.id)?2:0);render();};$('show-solution').disabled=false;
  install(current);
  setupRulesCard({dialog:$('rules-dialog'),button:$('rules-button'),close:$('rules-close'),storage,first:!legacy&&!devMode&&startIndex===0});
  // Copy timing only; authored guidance remains state-driven, with no solver.
  const copyTimer=setInterval(()=>{if(!devMode&&(board.id==='T1'||activeHint)&&!player.evaluate().solved)updateStatus();},200);
  window.addEventListener('pagehide',()=>{clearInterval(copyTimer);clearTimeout(timer);worker?.terminate();renderer?.dispose();},{once:true});
}catch(error){$('status').textContent=`Unable to start: ${error.message}`;$('status').className='error';}
