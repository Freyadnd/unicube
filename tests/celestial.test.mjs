import test from 'node:test';
import assert from 'node:assert/strict';
import {createGesture,celestialState} from '../src/celestial-input.mjs';
import {t1Guide} from '../src/celestial-guide.mjs';
import {createTopology} from '../experiments/cube-topology/topology.mjs';
import {createPlayer} from '../src/player.mjs';
import {solve} from '../experiments/single-face/model.mjs';
import {readFileSync} from 'node:fs';
const fixture=JSON.parse(readFileSync(new URL('../experiments/tutorial-levels/small.json',import.meta.url)))[0];
function rig(){let time=0,rotations=0;const state=Array(9).fill(0),events=[];const g=createGesture({pick:x=>x<9?Math.floor(x):null,now:()=>time,rotate:()=>rotations++,click:(id,action)=>{events.push([id,action]);state[id]=celestialState(state[id],action);}});const e=(x=0)=>({pointerId:1,button:0,clientX:x,clientY:0});return {g,state,events,e,get rotations(){return rotations;},tap(x){g.start(e(x));g.end(e(x));},time(t){time=t;}};}
test('single stars toggle; double taps place and remove unicorns without delay',()=>{const r=rig();r.tap(0);assert.equal(r.state[0],1);r.time(400);r.tap(0);assert.equal(r.state[0],0);r.time(500);r.tap(0);assert.equal(r.state[0],2);r.time(1000);r.tap(0);assert.equal(r.state[0],2);r.time(1100);r.tap(0);assert.equal(r.state[0],0);});
test('different cells never double; drag is sticky and release/cancel permit new clicks',()=>{const r=rig();r.tap(0);r.time(20);r.tap(1);assert.deepEqual(r.state.slice(0,2),[1,1]);r.g.start(r.e(2));r.g.move(r.e(30));r.g.move(r.e(2));r.g.end(r.e(2));assert.equal(r.state[2],0);assert.ok(r.g.idle);r.g.move(r.e(50));const rotations=r.rotations;r.tap(3);assert.equal(r.state[3],1);assert.equal(r.rotations,rotations);r.g.start(r.e(4));r.g.move(r.e(40));r.g.cancel();assert.ok(r.g.idle);r.tap(5);assert.equal(r.state[5],1);});
test('T1 guide asks only sound exclusions, requires actual dim/unicorn state, and completes',()=>{const t=createTopology(3),p=createPlayer({front:fixture.map},t,[],['front']),id=i=>t.faceCellToPhysical('front',Math.floor(i/3),i%3),get=i=>p.get(id(i));assert.equal(fixture.map.filter(x=>x===2).length,1);assert.equal(fixture.map[5],2);const solutions=solve(fixture.map,3);assert.equal(solutions.length,1);for(const i of [3,4])assert.notEqual(solutions[0][1],i%3);
 assert.deepEqual(t1Guide(get).targets,[3,4]);p.set(id(0),1);assert.deepEqual(t1Guide(get).targets,[3,4]);p.set(id(3),1);assert.deepEqual(t1Guide(get).targets,[4]);p.set(id(4),1);assert.deepEqual(t1Guide(get).targets,[5]);p.set(id(5),1);assert.equal(t1Guide(get).done,undefined);p.set(id(5),2);assert.equal(t1Guide(get).done,true);for(const [r,c] of fixture.truth.entries())p.set(id(r*3+c),2);assert.equal(p.evaluate().solved,true);p.reset();assert.deepEqual(t1Guide(get).targets,[3,4]);});

test('actual renderer draws T1 stars/emoji and releases pointer listeners on level disposal',async()=>{
 const {createRenderer}=await import('../src/renderer3d.mjs');
 const saved=[globalThis.devicePixelRatio,globalThis.requestAnimationFrame,globalThis.cancelAnimationFrame];let frame;
 globalThis.devicePixelRatio=1;globalThis.requestAnimationFrame=fn=>(frame=fn,1);globalThis.cancelAnimationFrame=()=>{};
 try {
 const gl=new Proxy({NO_ERROR:0,getError:()=>0,getShaderParameter:()=>true,getProgramParameter:()=>true,getAttribLocation:()=>0,getUniformLocation:()=>({}),createBuffer:()=>({}),createShader:()=>({}),createProgram:()=>({})},{get:(o,k)=>k in o?o[k]:()=>{}});
 const texts=[],dots=[],ctx=new Proxy({fillText:t=>texts.push(t),arc:(x,y,r)=>dots.push(r)},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)}),listeners=new Map();let captured=false;
 const canvas={width:800,height:600,clientWidth:800,clientHeight:600,getContext:()=>gl,getBoundingClientRect:()=>({left:0,top:0,width:800,height:600}),addEventListener:(k,v)=>listeners.set(k,v),removeEventListener:k=>listeners.delete(k),setPointerCapture:()=>captured=true,hasPointerCapture:()=>captured,releasePointerCapture:()=>{captured=false;listeners.get('lostpointercapture')?.({});}};
 const t=createTopology(3),p=createPlayer({front:fixture.map},t,[],['front']);
 const r=createRenderer(canvas,{topology:t,maps:{front:fixture.map},activeFaces:['front'],player:p,celestial:true,overlay:{width:800,height:600,getContext:()=>ctx},onPick:(id,b,action)=>p.set(id,celestialState(p.get(id),action))});r.rotation={x:0,y:0};
 const event={pointerId:1,button:0,clientX:400,clientY:300},id=r.pick(400,300);assert.equal(id,t.faceCellToPhysical('front',1,1));
 for(const expected of [1,2]){listeners.get('pointerdown')(event);listeners.get('pointerup')(event);assert.equal(p.get(id),expected);assert.equal(captured,false);}
 frame();assert.ok(texts.includes('🦄'));const rotation=r.rotation;listeners.get('pointermove')({...event,clientX:420});assert.deepEqual(r.rotation,rotation);r.dispose();assert.equal(listeners.size,0);
 const {topology}=await import('../experiments/cube-topology/topology.mjs');
 const {createPreviewPlayer}=await import('../src/cube-preview.mjs');
 const board=JSON.parse(readFileSync(new URL('../experiments/rainbow-cube/examples.json',import.meta.url))).C;
 texts.length=0;
 const preview=createRenderer(canvas,{topology,maps:board.maps,player:createPreviewPlayer(board),celestial:true,cubePreview:true,overlay:{width:800,height:600,getContext:()=>ctx}});
 assert.deepEqual(preview.rotation,{x:.30,y:-.40});
 assert.ok(dots.includes(.07),'excluded cube positions draw circular remnants');
 assert.equal(texts.filter(t=>t==='🦄').length,8,'only front/right/top emoji representations are visible');
 assert.ok(preview.pick(400,300));
 preview.rotation={x:0,y:Math.PI};texts.length=0;frame();
 assert.equal(texts.filter(t=>t==='🦄').length,1,'back corner representation survives rotation, near-face overlays disappear');
 preview.faceTo('right');await new Promise(resolve=>setTimeout(resolve,370));frame();assert.equal(preview.frontFace,'right');
 preview.dispose();assert.equal(listeners.size,0);
 const guided=createRenderer(canvas,{topology,maps:board.maps,player:createPreviewPlayer(board),celestial:true,campaign:true,overlay:{width:800,height:600,getContext:()=>ctx},guidance:()=>({key:0,camera:{x:.5,y:-.8}})});
 guided.rotation={x:.2,y:-.2};guided.faceTo('top');listeners.get('pointerdown')(event);frame();
 assert.deepEqual(guided.rotation,{x:.2,y:-.2},'manual pointerdown cancels guided camera motion');
 listeners.get('pointercancel')(event);guided.dispose();assert.equal(listeners.size,0);


 }finally{[globalThis.devicePixelRatio,globalThis.requestAnimationFrame,globalThis.cancelAnimationFrame]=saved;}
});
