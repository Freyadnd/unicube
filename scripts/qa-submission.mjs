import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {resolve} from 'node:path';
const path=process.argv[2]||'dist/checkpoints/compact/index.html',html=await readFile(resolve(path),'utf8'),js=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
if(!js)throw Error('Missing inlined production script');
const packed=js.match(/=(\[\[3,\[[\s\S]*?\]\])\.map\(/)?.[1];
if(!packed)throw Error('Cannot locate packed campaign in production script');
const stages=runInNewContext(`(${packed})`),names=['FIRST STEPS','CONSTELLATION','DEEPER','UNICUBE'];
for(let i=0;i<4;i++){
  const [n,maps,truth,fixed,excluded,tutorial,startFace,title]=stages[i];
  if(n!==[3,4,5,7][i]||maps.length!==6||maps.some(map=>map.length!==n*n)||!truth.length||!fixed.length||!Array.isArray(excluded)||!['front','back','left','right','top','bottom'].includes(startFace)||title!==names[i])throw Error(`Invalid packed act ${i+1}`);
  if(i===0&&(!tutorial||tutorial.length<2))throw Error('Missing first-act tutorial');
  console.log(`packed act ${i+1}: ${n}x${n}, 6 maps, ${fixed.length} fixed, ${excluded.length} excluded, ${startFace}, ${title}${tutorial?`, ${tutorial.length} tutorial steps`:''}`);
}
const elements=new Map(),classes=()=>({toggle(){},add(){},remove(){}});
function element(){return {textContent:'',innerHTML:'',children:[],hidden:false,disabled:false,open:false,dataset:{},style:{setProperty(){}},classList:classes(),append(...x){this.children.push(...x)},replaceChildren(...x){this.children=x},setAttribute(){},addEventListener(){},removeEventListener(){},showModal(){this.open=true},close(){this.open=false}};}
const get=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);};
const gl=new Proxy({NO_ERROR:0,getError:()=>0,getShaderParameter:()=>true,getProgramParameter:()=>true,getAttribLocation:()=>0,getUniformLocation:()=>({}),createBuffer:()=>({}),createShader:()=>({}),createProgram:()=>({})},{get:(o,k)=>k in o?o[k]:()=>{}});
const ctx=new Proxy({},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
const canvas=get('cube');Object.assign(canvas,{width:800,height:600,clientWidth:800,clientHeight:600,getContext:()=>gl,getBoundingClientRect:()=>({left:0,top:0,width:800,height:600}),setPointerCapture(){},hasPointerCapture:()=>false,releasePointerCapture(){}});Object.assign(get('overlay'),{width:800,height:600,getContext:()=>ctx});
const window={addEventListener(){}};const document={getElementById:get,createElement:element};
let lastFrame;
const context={window,document,performance,devicePixelRatio:1,requestAnimationFrame:fn=>(lastFrame=fn,1),cancelAnimationFrame(){},setInterval(){return 1},clearInterval(){},localStorage:{getItem:()=>null,setItem(){}},console};
runInNewContext(js,context,{filename:path});
console.log('title count:',get('progress').children.length,'face count:',get('faces').children.length,'rules:',get('rules-card').open,'status:',get('status').textContent);
