import levels from './production-data.mjs';
import {topology,createTopology} from '../experiments/cube-topology/topology.mjs';
import {createPlayer} from '../src/player.mjs';
import {createRenderer} from '../src/renderer3d.mjs';
import {celestialState} from '../src/celestial-input.mjs';
import {cubeTutorial} from '../src/cube-tutorial.mjs';
import {faceProgress,campaignProgress,findHint} from '../src/play-assist.mjs';
import {createProgress} from '../src/levels.mjs';
import {setupRulesCard} from '../src/rules-card.mjs';

const $=id=>document.getElementById(id),faces=['front','back','left','right','top','bottom'];
let storage=null;try{storage=localStorage;}catch{}
const progress=createProgress(storage),faceButtons=new Map();
let index=0,board,t,player,renderer,hint=null,front='front';
function guidance(){
  if(hint){const ready=performance.now()-hint.started>900;return {text:ready?hint.text:`look at this ${hint.kind==='region'?'rainbow':hint.kind}`,face:hint.face,physical:hint.cells,targetsPhysical:ready?hint.targets:[]};}
  if(index===0)return cubeTutorial(board,id=>player.get(id),t);
  return {text:'',physical:[]};
}
function rules(){
  const edge=index>0||player.get(board.tutorial[2].target)===1;
  const corner=index>0||player.get(board.tutorial[5].target)===1;
  $('rules-copy').innerHTML='✦ possible<br>· ruled out<br>🦄 unicorn<br><br>tap — rule out / restore<br>double-tap — place / remove 🦄<br>drag — rotate<br><br>1 🦄 per row<br>1 🦄 per column<br>1 🦄 per rainbow'+(edge?'<br>edges are shared':'')+(corner?'<br>corners are shared':'');
}
function navigation(){
  for(const f of faceProgress(board,t,player)){
    const b=faceButtons.get(f.face);b.count.textContent=`${f.placed}/${f.required}`;
    b.classList.toggle('complete',f.complete);b.classList.toggle('front-facing',f.face===front);
    b.setAttribute('aria-pressed',f.face===front);b.setAttribute('aria-label',`${f.face}: ${f.placed} of ${f.required}${f.complete?', complete':''}`);
  }
  $('progress').replaceChildren(...campaignProgress(levels,index,Math.min(levels.length,progress.highest)).map(p=>{
    const span=document.createElement('span');span.textContent=p.n;span.classList.toggle('current',p.current);span.classList.toggle('complete',p.complete);
    if(p.current)span.setAttribute('aria-current','step');return span;
  }));
}
function draw(){
  const solved=player.evaluate().solved;
  if(solved)progress.complete(index+1);
  $('object').classList.toggle('solved',solved);
  $('status').textContent=solved?'Perfect.':guidance().text;
  $('status').classList.toggle('solved',solved);
  $('next').hidden=!solved||index===levels.length-1;
  $('undo').disabled=!player.canUndo;
  const marks=player.marks();
  $('reset').disabled=!marks.excluded.some(id=>!player.fixedExcluded.has(id))&&marks.required.every(id=>player.fixed.has(id));
  rules();navigation();
}
function load(i){
  renderer?.dispose();index=i;board={...levels[i],activeFaces:faces};t=board.n===7?topology:createTopology(board.n);
  player=createPlayer(board.maps,t,board.fixed,faces,board.excluded);hint=null;front=board.startFace;
  faceButtons.clear();$('faces').replaceChildren();
  for(const face of faces){
    const b=document.createElement('button'),label=document.createElement('span');label.textContent=face[0].toUpperCase()+face.slice(1);
    b.count=document.createElement('span');b.append(label,b.count);b.onclick=()=>{hint=null;renderer.faceTo(face);draw();};
    faceButtons.set(face,b);$('faces').append(b);
  }
  renderer=createRenderer($('cube'),{topology:t,maps:board.maps,player,activeFaces:faces,overlay:$('overlay'),celestial:true,campaign:true,startFace:board.startFace,
    guidance,onFocusFace:face=>{front=face;navigation();},onPick:(id,_button,action)=>{
      if(player.locked.has(id))return;hint=null;player.set(id,celestialState(player.get(id),action));draw();
    },onError:error=>{$('status').textContent=error;}});
  draw();
}
$('undo').onclick=()=>{hint=null;player.undo();draw();};
$('reset').onclick=()=>{hint=null;player.reset();draw();};
$('hint').onclick=()=>{
  hint=findHint(board,t,player,renderer.frontFace);
  hint=hint?{...hint,started:performance.now()}:{text:'no simple hint yet',kind:'face',cells:[],targets:[],started:-Infinity};
  for(const [face,b] of faceButtons)b.classList.toggle('hinted',face===hint.face);
  if(hint.face&&hint.face!==renderer.frontFace)renderer.faceTo(hint.face);
  draw();
};
$('next').onclick=()=>{if(player.evaluate().solved&&index<levels.length-1)load(index+1);};
setupRulesCard({dialog:$('rules-card'),button:$('rules'),close:$('close-rules'),storage,first:true});
load(0);
const copyTimer=setInterval(()=>{if(!player.evaluate().solved&&(index===0||hint))$('status').textContent=guidance().text;},200);
window.addEventListener('pagehide',()=>{clearInterval(copyTimer);renderer?.dispose();},{once:true});
