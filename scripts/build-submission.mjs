import {readFile,writeFile,mkdir,copyFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {deflateRawSync} from 'node:zlib';
import {build,transform} from 'esbuild';
import {minify} from 'terser';

const root=fileURLToPath(new URL('../',import.meta.url)),dist=resolve(root,'dist'),work=resolve(dist,'checkpoints');
const load=async path=>JSON.parse(await readFile(resolve(root,path),'utf8'));
const faces=['front','back','left','right','top','bottom'];
const selected=[...await load('experiments/small-cubes/examples.json'),(await load('experiments/tutorial-levels/examples.json')).find(x=>x.id==='L5')];
if(selected.length!==4||selected.some(x=>!x||faces.some(f=>!x.maps[f])||!x.truth?.length))throw Error('Missing verified four-act data');
const startFaces=['front','top','back','left'],titles=['FIRST STEPS','CONSTELLATION','DEEPER','UNICUBE'];
const clean=selected.map((x,i)=>({n:x.n||7,maps:x.maps,truth:x.truth,fixed:x.fixed,excluded:x.excluded||[],tutorial:x.tutorial?.map(({target,state,unit,text,edge,corner,camera})=>({target,state,unit,text,edge,corner,camera})),startFace:startFaces[i],title:titles[i]}));
const idNumber=(id,n)=>id.split(',').map(Number).reduce((a,v)=>a*n+v,0);
const compact=selected.map((x,i)=>{const n=x.n||7;return [n,faces.map(f=>x.maps[f].join('')),x.truth.map(id=>idNumber(id,n)),x.fixed.map(id=>idNumber(id,n)),(x.excluded||[]).map(id=>idNumber(id,n)),x.tutorial?.map(step=>[idNumber(step.target,n),step.state,step.unit.map(id=>idNumber(id,n)),step.text,step.edge,step.corner&&idNumber(step.corner,n),step.camera]),startFaces[i],titles[i]]});
const readableData=`export default ${JSON.stringify(clean)};`;
const compactData=`const faces=${JSON.stringify(faces)},encoded=${JSON.stringify(compact)};
const id=(v,n)=>[Math.floor(v/n/n),Math.floor(v/n)%n,v%n].join(',');
export default encoded.map(([n,m,t,f,e,steps,startFace,title])=>({n,maps:Object.fromEntries(faces.map((face,i)=>[face,[...m[i]].map(Number)])),truth:t.map(v=>id(v,n)),fixed:f.map(v=>id(v,n)),excluded:e.map(v=>id(v,n)),tutorial:steps?.map(([target,state,unit,text,edge,corner,camera])=>({target:id(target,n),state,unit:unit.map(v=>id(v,n)),text,edge,corner:corner==null?undefined:id(corner,n),camera})),startFace,title}));`;
const html=await readFile(resolve(root,'production/index.html'),'utf8'),cssSource=await readFile(resolve(root,'production/style.css'),'utf8');
const css=(await transform(cssSource,{loader:'css',minify:true})).code.trim();
function packedHtml(js,style){return html.replace('<!--STYLE-->',`<style>${style}</style>`).replace('<!--SCRIPT-->',`<script>${js}</script>`).replace(/>\s+</g,'><').trim();}
async function stage(name,data,compactJS=false){
 const plugin={name:'verified-level-data',setup(ctx){ctx.onResolve({filter:/production-data\.mjs$/},()=>({path:'verified-level-data',namespace:'generated'}));ctx.onLoad({filter:/.*/,namespace:'generated'},()=>({contents:data,loader:'js'}));}};
 const result=await build({entryPoints:[resolve(root,'production/main.mjs')],bundle:true,write:false,format:'iife',platform:'browser',target:'es2022',minify:compactJS,legalComments:'none',metafile:true,plugins:[plugin]});
 let js=result.outputFiles[0].text;
 if(compactJS){const terser=await minify(js,{compress:{passes:2},mangle:{toplevel:true},format:{comments:false}});if(terser.error)throw terser.error;js=terser.code;}
 const page=packedHtml(js,compactJS?css:cssSource),folder=resolve(work,name),archive=resolve(work,`${name}.zip`);
 await mkdir(folder,{recursive:true});await writeFile(resolve(folder,'index.html'),page);
 try{execFileSync('zip',['-q','-9','-X',archive,'index.html'],{cwd:folder});}catch(error){throw Error(`ZIP failed: ${error.message}`);}
 const bytes=(await stat(archive)).size;
 console.log(`${name.toUpperCase()} ZIP BYTES: ${bytes}`);
 return {archive,page,js,css:compactJS?css:cssSource,bytes,inputs:Object.keys(result.metafile.inputs)};
}
await mkdir(work,{recursive:true});
const a=await stage('stripped',readableData,false),b=await stage('bundled',readableData,true),c=await stage('compact',compactData,true);
const limit=13312,headroom=limit-c.bytes;
const forbidden=['experiments/','tests/','solver-worker','cube-preview','sourceMappingURL','console.log','http://','https://'];
for(const term of forbidden)if(c.page.includes(term))throw Error(`Production artifact contains forbidden text: ${term}`);
if(!c.page.includes('🦄'))throw Error('Production is missing native unicorn emoji');
console.log(`INDEX.HTML UNCOMPRESSED BYTES: ${Buffer.byteLength(c.page)}`);
console.log(`ESTIMATED RAW DEFLATE CONTRIBUTIONS: HTML ${deflateRawSync(Buffer.from(html),{level:9}).length}; CSS ${deflateRawSync(Buffer.from(c.css),{level:9}).length}; JS ${deflateRawSync(Buffer.from(c.js),{level:9}).length}; DATA ${deflateRawSync(Buffer.from(compactData),{level:9}).length}`);
console.log(`SOURCE GRAPH: ${c.inputs.join(', ')}`);
console.log(`FINAL ZIP BYTES: ${c.bytes}`);
console.log(`LIMIT: ${limit}`);
console.log(`HEADROOM: ${headroom}`);
console.log(`STATUS: ${headroom>=0?'PASS':'FAIL'}`);
if(process.argv.includes('--publish')){
 if(headroom<0)throw Error('Refusing to publish an oversized ZIP');
 await copyFile(c.archive,resolve(dist,'unicube-submission.zip'));
 console.log(`PUBLISHED: ${resolve(dist,'unicube-submission.zip')}`);
}
