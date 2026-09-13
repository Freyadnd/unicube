import {topology} from '../experiments/cube-topology/topology.mjs';
import {createPlayer} from '../src/player.mjs';
import {createRenderer} from '../src/renderer3d.mjs';
import {celestialState} from '../src/celestial-input.mjs';
import {faceProgress,findHint} from '../src/play-assist.mjs';
import {resolveConstellation,nextConstellation,validateBank} from './bank.mjs';

const $=id=>document.getElementById(id),faces=topology.faces;
let bank=[],board,player,renderer,hint=null,front='front';
const buttons=new Map;
function guidance(){
  if(!hint)return {text:'',physical:[]};
  const ready=performance.now()-hint.started>900;
  return {text:ready?hint.text:`look at this ${hint.kind==='region'?'rainbow':hint.kind}`,face:hint.face,physical:hint.cells,targetsPhysical:ready?hint.targets:[]};
}
function navigation(){
  for(const face of faceProgress({...board,activeFaces:faces},topology,player)){
    const b=buttons.get(face.face);b.count.textContent=`${face.placed}/${face.required}`;
    b.classList.toggle('complete',face.complete);b.classList.toggle('front-facing',face.face===front);
    b.setAttribute('aria-pressed',face.face===front);
    b.setAttribute('aria-label',`${face.face}: ${face.placed} of ${face.required}${face.complete?', complete':''}`);
  }
}
function draw(){
  const solved=player.evaluate().solved;
  $('object').classList.toggle('solved',solved);
  $('status').textContent=solved?'Perfect.':guidance().text;
  $('status').classList.toggle('solved',solved);
  $('undo').disabled=!player.canUndo;
  const marks=player.marks();
  $('reset').disabled=!marks.excluded.length&&marks.required.every(id=>player.fixed.has(id));
  navigation();
}
function load(item,writeHistory=true){
  renderer?.dispose();board=item;hint=null;front=item.startFace;
  player=createPlayer(item.maps,topology,item.fixed,faces);
  $('constellation-label').textContent=`CONSTELLATION #${item.id}`;
  $('info-title').textContent=`CONSTELLATION #${item.id}`;
  $('local-counts').textContent=item.metadata.localSolutionCounts.join(' × ');
  $('local-product').textContent=Number(item.metadata.independentLocalCombinationCount).toLocaleString();
  $('global-count').textContent=item.metadata.globalSolutionCount;
  buttons.clear();$('faces').replaceChildren();
  for(const face of faces){
    const button=document.createElement('button'),label=document.createElement('span');label.textContent=face[0].toUpperCase()+face.slice(1);
    button.count=document.createElement('span');button.append(label,button.count);
    button.onclick=()=>{hint=null;renderer.faceTo(face);draw();};buttons.set(face,button);$('faces').append(button);
  }
  renderer=createRenderer($('cube'),{topology,maps:item.maps,player,activeFaces:faces,overlay:$('overlay'),celestial:true,campaign:true,startFace:item.startFace,
    guidance,onFocusFace:face=>{front=face;navigation();},onPick:(id,_button,action)=>{
      if(player.locked.has(id))return;
      hint=null;player.set(id,celestialState(player.get(id),action));draw();
    },onError:error=>{$('status').textContent=error;}});
  if(writeHistory)history.pushState({s:item.id},'',`?s=${item.id}`);
  draw();
}
function open(dialog){dialog.showModal();}
function close(dialog){dialog.close();}
$('rules').onclick=()=>open($('rules-card'));
$('close-rules').onclick=()=>close($('rules-card'));
$('info').onclick=()=>open($('info-card'));
$('close-info').onclick=()=>close($('info-card'));
$('undo').onclick=()=>{hint=null;player.undo();draw();};
$('reset').onclick=()=>{hint=null;player.reset();draw();};
$('hint').onclick=()=>{
  hint=findHint({...board,activeFaces:faces},topology,player,renderer.frontFace);
  hint=hint?{...hint,started:performance.now()}:{text:'no simple hint yet',kind:'face',cells:[],targets:[],started:-Infinity};
  if(hint.face&&hint.face!==renderer.frontFace)renderer.faceTo(hint.face);
  draw();
};
$('new').onclick=()=>load(nextConstellation(bank,board));
window.addEventListener('popstate',()=>load(resolveConstellation(bank,location.search),false));
try{
  const response=await fetch('./constellations.json');if(!response.ok)throw Error('Could not load verified constellations');
  const data=await response.json();bank=validateBank(data.constellations);
  const selected=resolveConstellation(bank,location.search);
  load(selected,new URLSearchParams(location.search).get('s')!==selected.id);
}catch(error){$('status').textContent=`Unable to start: ${error.message}`;}
const copyTimer=setInterval(()=>{if(player&&hint&&!player.evaluate().solved)$('status').textContent=guidance().text;},200);
window.addEventListener('pagehide',()=>{clearInterval(copyTimer);renderer?.dispose();},{once:true});
