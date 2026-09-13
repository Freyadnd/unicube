import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Exercise the real app entry, DOM handlers, renderer construction and Next.
// WebGL/DOM calls are mocked: this checks wiring, not browser visual quality.
for(const legacy of [true,false])test(`${legacy?'legacy seven-stage':'true four-cube'} app startup and Next handlers`,async()=>{
  const keys=['document','window','location','fetch','devicePixelRatio','requestAnimationFrame','cancelAnimationFrame','setInterval','clearInterval'];
  const storageDescriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  const originals=Object.fromEntries(keys.map(k=>[k,globalThis[k]]));
  const gl=new Proxy({NO_ERROR:0,getError:()=>0,getShaderParameter:()=>true,getProgramParameter:()=>true,getAttribLocation:()=>0,getUniformLocation:()=>({}),createBuffer:()=>({}),createShader:()=>({}),createProgram:()=>({})},{get:(o,k)=>k in o?o[k]:()=>{}});
  const ctx=new Proxy({},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
  const elements=new Map(),classes=()=>({toggle(){},add(){},remove(){}});
  function element(){return {children:[],textContent:'',hidden:false,disabled:false,open:false,dataset:{},style:{setProperty(){}},classList:classes(),append(...nodes){this.children.push(...nodes);},replaceChildren(...nodes){this.children=nodes;},setAttribute(){},addEventListener(){},removeEventListener(){},showModal(){this.open=true;},close(){this.open=false;}};}
  const get=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);};
  const canvas=get('cube');Object.assign(canvas,{width:800,height:600,clientWidth:800,clientHeight:600,getContext:()=>gl,getBoundingClientRect:()=>({left:0,top:0,width:800,height:600})});
  Object.assign(get('emoji-overlay'),{width:800,height:600,getContext:()=>ctx});
  const titles=legacy?['FIRST STEPS','ONE OF EACH','YOUR TURN','FULL RAINBOW','THE EDGE','THE CORNER','UNICUBE']:['FIRST STEPS','CONSTELLATION','DEEPER','UNICUBE'];
  let cleanup;
  try{
    Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>null,setItem(){}}});
    globalThis.document={body:{classList:classes()},getElementById:get,querySelector:get,createElement:element};
    globalThis.window={addEventListener:(event,fn)=>{if(event==='pagehide')cleanup=fn;}};
    globalThis.location={search:legacy?'?dev-campaign=legacy':''};globalThis.devicePixelRatio=1;
    globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
    globalThis.setInterval=()=>1;globalThis.clearInterval=()=>{};
    const requests=[];
    globalThis.fetch=async path=>{requests.push(path);return {ok:true,json:async()=>JSON.parse(readFileSync(new URL(`..${path}`,import.meta.url)))};};
    await import(`../src/app.mjs?legacy=${legacy}`);
    assert.equal(requests.length,legacy?3:4);
    assert.ok(!get('status').textContent.startsWith('Unable'),get('status').textContent);
    assert.equal(get('rules-button').textContent,'Rules');
    if(!legacy){assert.equal(get('rules-dialog').open,true);assert.equal(get('rules-close').textContent,'Play');get('rules-close').onclick();assert.equal(get('rules-dialog').open,false);}
    for(let i=0;i<titles.length;i++){
      assert.equal(get('.celestial-title').textContent,titles[i]);
      assert.equal(get('selected').textContent,legacy?`T${i+1}`:`U${[3,4,5,7][i]}`);
      assert.equal(get('level-indicator').textContent,`${i+1} / ${titles.length}`);
      assert.equal(get('next-level').hidden,true,'Next hidden before solving');
      assert.equal(get('undo').disabled,true,'fresh undo history');
      if(!legacy){assert.equal(get('face-nav').children.length,6);assert.equal(get('campaign-progress').children.length,4);const placed=get('placed').textContent;get('face-nav').children[1].onclick();assert.equal(get('placed').textContent,placed);get('hint-button').onclick();assert.equal(get('placed').textContent,placed);assert.equal(get('undo').disabled,true);}
      // Hidden development action supplies the saved truth to the real player.
      get('show-solution').onclick();
      assert.equal(get('status').textContent,'Perfect.');
      assert.equal(get('next-level').hidden,i===titles.length-1);
      if(i<titles.length-1)get('next-level').onclick();
    }
    assert.ok(get('rules-copy').innerHTML.includes('corners are shared'));
  }finally{cleanup?.();if(storageDescriptor)Object.defineProperty(globalThis,'localStorage',storageDescriptor);else delete globalThis.localStorage;for(const key of keys)if(originals[key]===undefined)delete globalThis[key];else globalThis[key]=originals[key];}
});
