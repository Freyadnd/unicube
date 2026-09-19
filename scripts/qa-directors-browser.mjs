import {createServer} from 'node:http';
import {readFile,writeFile,mkdtemp,mkdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,resolve,extname} from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';

const root=resolve('dist/directors'),bank=JSON.parse(await readFile(join(root,'constellations.json'))).constellations;
const requests=[],mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json'};
const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname;requests.push(path);
  if(path==='/favicon.ico'){res.writeHead(204).end();return;}
  try{const file=join(root,path==='/'?'index.html':path);const data=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]}).end(data);}
  catch{res.writeHead(404).end();}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const profile=await mkdtemp(join(tmpdir(),'unicube-directors-'));
const chrome=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',[
  '--headless=new','--no-first-run','--no-default-browser-check','--disable-dev-shm-usage',
  '--enable-unsafe-swiftshader','--use-angle=swiftshader','--remote-debugging-port=0',
  `--user-data-dir=${profile}`,'about:blank'
],{stdio:['ignore','ignore','pipe']});
let chromeErr='';chrome.stderr.on('data',x=>chromeErr+=x);
try{
  let port;for(let i=0;i<100;i++){try{port=+(await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];break;}catch{await sleep(100);}}
  if(!port)throw Error(`Chrome did not start: ${chromeErr.slice(-1000)}`);
  const tabs=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(),tab=tabs.find(x=>x.type==='page');
  const ws=new WebSocket(tab.webSocketDebuggerUrl),pending=new Map(),errors=[];
  await new Promise((ok,fail)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',fail,{once:true});});
  let serial=0;ws.addEventListener('message',event=>{
    const message=JSON.parse(event.data);
    if(message.id){const p=pending.get(message.id);pending.delete(message.id);message.error?p.reject(Error(message.error.message)):p.resolve(message.result);}
    else if(message.method==='Runtime.exceptionThrown'||message.method==='Log.entryAdded'&&message.params.entry.level==='error'||message.method==='Network.loadingFailed')errors.push(message);
  });
  const send=(method,params={})=>new Promise((ok,fail)=>{const id=++serial;pending.set(id,{resolve:ok,reject:fail});ws.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result.value;};
  const snap=async name=>{const {data}=await send('Page.captureScreenshot',{format:'png'});const folder=resolve('dist/checkpoints');await mkdir(folder,{recursive:true});const path=join(folder,name);await writeFile(path,Buffer.from(data,'base64'));return path;};
  await send('Page.enable');await send('Runtime.enable');await send('Log.enable');await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/?s=${bank[0].id}`});await sleep(1200);
  const initial=await evaluate(`({label:document.querySelector('#constellation-label').textContent,faces:document.querySelectorAll('#faces button').length,webgl:!!document.querySelector('#cube').getContext('webgl'),status:document.querySelector('#status').textContent})`);
  if(initial.label!==`CONSTELLATION #${bank[0].id}`||initial.faces!==6||!initial.webgl||initial.status.startsWith('Unable'))throw Error(`Startup failed: ${JSON.stringify(initial)}`);
  await evaluate(`document.querySelector('#learn').click()`);
  if(!await evaluate(`document.querySelector('#lesson-dialog').open`))throw Error('Tutorial did not open');
  if(await evaluate(`document.querySelectorAll('#lesson-dialog .lesson-tabs button').length`)!==6)throw Error('Tutorial progression does not show six lessons');
  await evaluate(`document.querySelectorAll('#lesson-dialog .lesson-controls button')[1].click();document.querySelectorAll('#lesson-dialog .lesson-controls button')[0].click()`);
  if(await evaluate(`document.querySelector('#lesson-dialog .lesson-controls span').textContent`)!=='1 / 7')throw Error('Tutorial Back did not restore the first step');
  const lessonNames=['Only spot','Locked pair','Row & Column','Rainbow Region','Intersection','Across the Cube'],stepCounts=[7,5,6,3,5,5],answerCells=[12,4,14,null,6,null],tutorial=[];
  let lessonRainbow,lessonIntersection;
  const lessonFlat=await snap('qa-directors-lesson-flat.png');
  for(let i=0;i<6;i++){
    const title=await evaluate(`document.querySelector('#lesson-dialog h2').textContent`);
    if(title!==lessonNames[i])throw Error(`Tutorial lesson ${i+1}: ${title}`);
    for(let j=1;j<stepCounts[i];j++)await evaluate(`document.querySelectorAll('#lesson-dialog .lesson-controls button')[1].click()`);
    if(i===3)lessonRainbow=await snap('qa-directors-lesson-rainbow.png');
    if(i===4)lessonIntersection=await snap('qa-directors-lesson-intersection.png');
    if(i===5){
      const matched=await evaluate(`({front:document.querySelectorAll('#lesson-dialog .lesson-face-panel')[0].querySelectorAll('.lesson-cell')[27].textContent,right:document.querySelectorAll('#lesson-dialog .lesson-face-panel')[1].querySelectorAll('.lesson-cell')[21].textContent})`);
      if(matched.front!=='🦄'||matched.right!=='🦄')throw Error(`Cube lesson did not mirror the shared cell: ${JSON.stringify(matched)}`);
    }
    await evaluate(`document.querySelectorAll('#lesson-dialog .lesson-controls button')[1].click()`);
    if(i===3){for(const cell of [5,6,9])await evaluate(`document.querySelectorAll('#lesson-dialog .lesson-cell')[${cell}].click()`);}
    else if(i===5){
      const before=await evaluate(`({front:document.querySelectorAll('#lesson-dialog .lesson-face-panel')[0].querySelectorAll('.lesson-cell')[34].textContent,right:document.querySelectorAll('#lesson-dialog .lesson-face-panel')[1].querySelectorAll('.lesson-cell')[28].textContent})`);
      if(before.front!=='🦄'||before.right==='🦄')throw Error(`Cube exercise did not mask neighboring answer: ${JSON.stringify(before)}`);
      await evaluate(`document.querySelectorAll('#lesson-dialog .lesson-face-panel')[1].querySelectorAll('.lesson-cell')[28].click()`);
      const after=await evaluate(`({right:document.querySelectorAll('#lesson-dialog .lesson-face-panel')[1].querySelectorAll('.lesson-cell')[28].textContent,out:document.querySelectorAll('#lesson-dialog .lesson-face-panel')[1].querySelectorAll('.lesson-cell')[29].textContent})`);
      if(after.right!=='🦄'||after.out!=='×')throw Error(`Cube exercise did not transfer the shared move: ${JSON.stringify(after)}`);
    }else await evaluate(`document.querySelectorAll('#lesson-dialog .lesson-cell')[${answerCells[i]}].click()`);
    if(!await evaluate(`document.querySelector('#lesson-dialog .lesson-cell.is-correct')!==null`))throw Error(`Tutorial exercise ${i+1} did not complete`);
    tutorial.push(title);
    await evaluate(`document.querySelectorAll('#lesson-dialog .lesson-controls button')[1].click()`);
  }
  if(await evaluate(`document.querySelector('#lesson-dialog h2').textContent`)!=='Across the Cube')throw Error('Final lesson did not replay');
  if(await evaluate(`document.querySelector('#lesson-dialog .lesson-controls span').textContent`)!=='1 / 5')throw Error('Final lesson replay did not reset steps');
  const lessonCube=await snap('qa-directors-lesson-cube.png');
  await evaluate(`document.querySelectorAll('#lesson-dialog .lesson-controls button')[2].click()`);
  if(await evaluate(`document.querySelector('#lesson-dialog').open`))throw Error('Tutorial Skip did not close');
  const desktop=await snap('qa-directors-desktop.png');
  await evaluate(`document.querySelector('#info').click()`);
  const info=await evaluate(`({open:document.querySelector('#info-card').open,local:document.querySelector('#local-counts').textContent,global:document.querySelector('#global-count').textContent})`);
  if(!info.open||info.global!=='1'||info.local!==bank[0].metadata.localSolutionCounts.join(' × '))throw Error(`Info mismatch: ${JSON.stringify(info)}`);
  await evaluate(`document.querySelector('#close-info').click();document.querySelector('#rules').click()`);
  if(!await evaluate(`document.querySelector('#rules-card').open`))throw Error('Rules did not open');
  await evaluate(`document.querySelector('#close-rules').click();document.querySelector('#hint').click();document.querySelector('#faces button').click()`);await sleep(390);
  if(!await evaluate(`document.querySelector('#faces button').classList.contains('front-facing')`))throw Error('Face navigator did not orient front');
  const click=async(x,y)=>{await send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',buttons:1,clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',buttons:0,clickCount:1});};
  await click(640,400);
  if(await evaluate(`document.querySelector('#undo').disabled`))throw Error('Cell click did not edit');
  await evaluate(`document.querySelector('#undo').click()`);
  if(!await evaluate(`document.querySelector('#reset').disabled`))throw Error('Undo did not restore initial state');
  await click(640,400);await click(640,400);
  if(!await evaluate(`document.querySelector('#faces button').textContent.includes('1/7')`))throw Error('Double click did not place unicorn');
  await evaluate(`document.querySelector('#reset').click();document.querySelector('#new').click()`);
  const next=await evaluate(`({label:document.querySelector('#constellation-label').textContent,search:location.search,faces:document.querySelectorAll('#faces button').length})`);
  if(next.label!==`CONSTELLATION #${bank[1].id}`||next.search!==`?s=${bank[1].id}`||next.faces!==6)throw Error(`New constellation failed: ${JSON.stringify(next)}`);
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:700,deviceScaleFactor:1,mobile:true});await sleep(300);
  await evaluate(`document.querySelector('#learn').click()`);
  const lessonMobileBounds=[];
  for(let i=0;i<6;i++){
    await evaluate(`document.querySelectorAll('#lesson-dialog .lesson-tabs button')[${i}].click()`);
    const bounds=await evaluate(`({dialog:document.querySelector('#lesson-dialog').getBoundingClientRect().toJSON(),controls:document.querySelector('#lesson-dialog .lesson-controls').getBoundingClientRect().toJSON()})`);
    if(bounds.dialog.left<0||bounds.dialog.right>390||bounds.dialog.top<0||bounds.dialog.bottom>700||bounds.controls.bottom>700)throw Error(`Tutorial lesson ${i+1} overflows mobile: ${JSON.stringify(bounds)}`);
    lessonMobileBounds.push(bounds.dialog);
  }
  const lessonBounds=await evaluate(`document.querySelector('#lesson-dialog').getBoundingClientRect().toJSON()`);
  if(lessonBounds.left<0||lessonBounds.right>390||lessonBounds.top<0||lessonBounds.bottom>700)throw Error(`Cube tutorial overflows mobile: ${JSON.stringify(lessonBounds)}`);
  const lessonMobile=await snap('qa-directors-lesson-mobile.png');
  await evaluate(`document.querySelector('#lesson-dialog .lesson-head button').click()`);
  const portrait=await snap('qa-directors-portrait.png');
  if(errors.length||requests.some(path=>!['/','/app.js','/style.css','/constellations.json','/favicon.ico'].includes(path)))throw Error(`Browser failures: ${JSON.stringify({errors,requests}).slice(0,2000)}`);
  console.log(JSON.stringify({initial,tutorial,lessonMobileBounds,lessonBounds,lessonFlat,lessonRainbow,lessonIntersection,lessonCube,lessonMobile,info,next,desktop,portrait,requests,errors:errors.length},null,2));
  ws.close();
}finally{chrome.kill('SIGTERM');server.close();}
