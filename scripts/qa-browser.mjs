import {createServer} from 'node:http';
import {readFile,writeFile,mkdtemp} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';
import {runInNewContext} from 'node:vm';
import {createTopology} from '../experiments/cube-topology/topology.mjs';
import {faceAngles} from '../src/face-camera.mjs';

const candidate=resolve(process.argv[2]||'dist/checkpoints/compact/index.html');
const page=await readFile(candidate);
const script=page.toString().match(/<script>([\s\S]*?)<\/script>/)?.[1];
const packed=script?.match(/=(\[\[3,\[[\s\S]*?\]\])\.map\(/)?.[1];
if(!packed)throw Error('Packed campaign missing from exact browser candidate');
const stages=runInNewContext(`(${packed})`),faceNames=['front','back','left','right','top','bottom'];
const server=createServer((req,res)=>{
  requests.push(req.url);
  if(req.url==='/favicon.ico'){res.writeHead(204);res.end();return;}
  if(req.url!=='/'){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(page);
});
const requests=[];
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}/`;
const profile=await mkdtemp(join(tmpdir(),'unicube-chrome-'));
const chrome=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',[
  '--headless=new','--no-first-run','--no-default-browser-check','--disable-dev-shm-usage',
  '--enable-unsafe-swiftshader','--use-angle=swiftshader','--remote-debugging-port=0',
  `--user-data-dir=${profile}`,'about:blank'
],{stdio:['ignore','ignore','pipe']});
let chromeErr='';chrome.stderr.on('data',chunk=>chromeErr+=chunk);
try{
  let port;
  for(let i=0;i<100;i++){try{port=+(await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];break;}catch{await sleep(100);}}
  if(!port)throw Error(`Chrome did not start: ${chromeErr.slice(-1000)}`);
  const tabs=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const tab=tabs.find(x=>x.type==='page');
  if(!tab)throw Error('Chrome opened without a page target');
  const ws=new WebSocket(tab.webSocketDebuggerUrl),pending=new Map(),events=[],errors=[];
  await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
  let id=0;
  ws.addEventListener('message',event=>{
    const msg=JSON.parse(event.data);
    if(msg.id){const p=pending.get(msg.id);pending.delete(msg.id);msg.error?p.reject(Error(msg.error.message)):p.resolve(msg.result);}
    else {events.push(msg);if(msg.method==='Runtime.exceptionThrown'||msg.method==='Log.entryAdded'&&msg.params.entry.level==='error')errors.push(msg);}
  });
  const send=(method,params={})=>new Promise((resolve,reject)=>{const i=++id;pending.set(i,{resolve,reject});ws.send(JSON.stringify({id:i,method,params}));});
  const evalJS=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result.value;};
  const snap=async name=>{const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});const path=join(tmpdir(),`unicube-${name}.png`);await writeFile(path,Buffer.from(r.data,'base64'));return path;};
  const mouse=async(type,x,y,buttons=0,clickCount=1)=>send('Input.dispatchMouseEvent',{type,x,y,button:'left',buttons,clickCount});
  const click=async(x,y)=>{await mouse('mousePressed',x,y,1);await mouse('mouseReleased',x,y,0);};
  await send('Page.enable');await send('Runtime.enable');await send('Log.enable');await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url});await sleep(1200);
  const initial=await evalJS(`({title:document.querySelector('h1')?.textContent,progress:[...document.querySelectorAll('#progress span')].map(x=>x.textContent),faces:[...document.querySelectorAll('#faces button')].map(x=>x.textContent),rules:document.querySelector('#rules-card').open,webgl:!!document.querySelector('#cube').getContext('webgl'),status:document.querySelector('#status').textContent})`);
  if(initial.title!=='UNICUBE'||initial.progress.join(',')!=='3,4,5,7'||initial.faces.length!==6||!initial.rules||!initial.webgl)throw Error(`Initial browser state failed: ${JSON.stringify(initial)}`);
  await evalJS(`document.querySelector('#close-rules').click()`);
  if(await evalJS(`document.querySelector('#rules-card').open`))throw Error('Rules did not close');
  const desktop=await snap('desktop');
  await evalJS(`document.querySelector('#rules').click()`);
  if(!await evalJS(`document.querySelector('#rules-card').open`))throw Error('Rules did not reopen');
  await evalJS(`document.querySelector('#close-rules').click()`);
  await evalJS(`document.querySelector('#hint').click()`);
  const hinted=await evalJS(`document.querySelector('#status').textContent`);
  await evalJS(`document.querySelector('#faces button').click()`);await sleep(450);
  const facing=await evalJS(`document.querySelector('#faces button.front-facing')?.textContent`);
  if(!facing?.startsWith('Front'))throw Error(`Face navigation failed: ${facing}`);
  await click(640,400);
  const afterClick=await evalJS(`({undo:document.querySelector('#undo').disabled,reset:document.querySelector('#reset').disabled})`);
  if(afterClick.undo||afterClick.reset)throw Error(`Candidate click did not edit: ${JSON.stringify(afterClick)}`);
  await evalJS(`document.querySelector('#undo').click()`);
  const afterUndo=await evalJS(`document.querySelector('#reset').disabled`);
  if(!afterUndo)throw Error('Undo did not restore initial state');
  await click(640,400);await click(640,400);
  const unicorn=await evalJS(`document.querySelector('#faces button').textContent`);
  if(!unicorn.includes('1/3'))throw Error(`Double click did not place unicorn: ${unicorn}`);
  await sleep(350);await click(640,400);await click(640,400);
  if(!await evalJS(`document.querySelector('#faces button').textContent.includes('0/3')`))throw Error('Double click did not remove unicorn');
  await sleep(350);await click(640,400);await click(640,400);
  await evalJS(`document.querySelector('#reset').click()`);
  const afterReset=await evalJS(`document.querySelector('#faces button').textContent`);
  if(!afterReset.includes('0/3'))throw Error(`Reset did not clear player unicorn: ${afterReset}`);
  await mouse('mousePressed',640,400,1);await mouse('mouseMoved',710,370,1);await mouse('mouseReleased',710,370,0);await click(640,400);
  if(await evalJS(`document.querySelector('#undo').disabled`))throw Error('Click after drag did not edit');
  await evalJS(`document.querySelector('#rules').click()`);
  if(!await evalJS(`document.querySelector('#rules-card').open`))throw Error('Rules did not open after rotation');
  await evalJS(`document.querySelector('#close-rules').click();document.querySelector('#hint').click()`);
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:700,deviceScaleFactor:1,mobile:true});await sleep(400);
  const mobile=await evalJS(`({cube:document.querySelector('#cube').getBoundingClientRect().toJSON(),rules:document.querySelector('#rules').getBoundingClientRect().toJSON(),faces:document.querySelector('#faces').getBoundingClientRect().toJSON(),width:innerWidth,height:innerHeight})`);
  const portrait=await snap('portrait');
  await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
  await evalJS(`document.querySelector('#reset').click();document.querySelector('#faces button').click()`);await sleep(400);
  const touch=async(type,points)=>send('Input.dispatchTouchEvent',{type,touchPoints:points});
  const tap=async(x,y)=>{await touch('touchStart',[{x,y,id:1}]);await touch('touchEnd',[]);};
  await tap(195,350);
  if(await evalJS(`document.querySelector('#undo').disabled`))throw Error('Portrait touch tap did not edit');
  await evalJS(`document.querySelector('#reset').click()`);await sleep(350);
  await tap(195,350);await tap(195,350);
  const touchUnicorn=await evalJS(`document.querySelector('#faces button').textContent`);
  if(!touchUnicorn.includes('1/3'))throw Error(`Portrait double tap did not place unicorn: ${touchUnicorn}`);
  await evalJS(`document.querySelector('#reset').click()`);
  await touch('touchStart',[{x:195,y:350,id:1}]);await touch('touchMove',[{x:245,y:330,id:1}]);await touch('touchEnd',[]);
  await tap(195,350);
  if(await evalJS(`document.querySelector('#undo').disabled`))throw Error('Touch tap after drag did not edit');
  await send('Emulation.setTouchEmulationEnabled',{enabled:false});
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});await sleep(200);
  await evalJS(`document.querySelector('#reset').click()`);
  const campaign=[];
  for(let act=0;act<stages.length;act++){
    const [n,,truth,fixed]=stages[act],topology=createTopology(n),given=new Set(fixed);
    const current=await evalJS(`document.querySelector('#progress .current')?.textContent`);
    if(current!==String(n))throw Error(`Act ${act+1} did not load: ${current}`);
    let placed=0;
    for(const number of truth){
      if(given.has(number))continue;
      const id=[Math.floor(number/n/n),Math.floor(number/n)%n,number%n].join(',');
      const ref=topology.physicalToFaceCells(id)[0],faceIndex=faceNames.indexOf(ref.face);
      await evalJS(`document.querySelectorAll('#faces button')[${faceIndex}].click()`);await sleep(390);
      const frame=topology.frames[ref.face],u=-1+2*(ref.col+.5)/n,v=1-2*(ref.row+.5)/n;
      const p=frame.normal.map((a,i)=>a+frame.column[i]*u-frame.row[i]*v),a=faceAngles[ref.face];
      const sx=Math.sin(a.x),cx=Math.cos(a.x),sy=Math.sin(a.y),cy=Math.cos(a.y);
      const x=cy*p[0]+sx*sy*p[1]+cx*sy*p[2],y=cx*p[1]-sx*p[2],z=-sy*p[0]+sx*cy*p[1]+cx*cy*p[2];
      const scale=Math.tan(Math.PI/8),distance=Math.max(5,1+4.6*800/1280)-z;
      const px=640+x*400/scale/distance,py=400-y*400/scale/distance;
      const before=await evalJS(`document.querySelectorAll('#faces button')[${faceIndex}].textContent`);
      await click(px,py);await click(px,py);
      const after=await evalJS(`document.querySelectorAll('#faces button')[${faceIndex}].textContent`);
      const count=text=>+(text.match(/(\d+)\//)?.[1]||0);
      if(count(after)!==count(before)+1)throw Error(`Act ${n} pick ${id} ${ref.face} r${ref.row}c${ref.col} at ${px.toFixed(1)},${py.toFixed(1)}: ${before} -> ${after}`);
      placed++;
    }
    const solved=await evalJS(`({status:document.querySelector('#status').textContent,next:document.querySelector('#next').hidden})`);
    if(solved.status!=='Perfect.')throw Error(`Act ${n} did not complete: ${JSON.stringify(solved)}`);
    campaign.push({n,placed,solved:solved.status});
    if(act<stages.length-1){if(solved.next)throw Error(`Next hidden after act ${n}`);await evalJS(`document.querySelector('#next').click()`);await sleep(150);}
  }
  const final=await snap('final');
  const failed=events.filter(x=>x.method==='Network.loadingFailed');
  if(errors.length||failed.length||requests.some(x=>x!=='/'&&x!=='/favicon.ico'))throw Error(`Browser errors: ${JSON.stringify({errors,failed,requests}).slice(0,3000)}`);
  console.log(JSON.stringify({url,initial,desktop,hinted,facing,afterClick,afterUndo,unicorn,afterReset,mobile,portrait,touchUnicorn,campaign,final,requests,errors:errors.length,failed:failed.length},null,2));
  ws.close();
}finally{chrome.kill('SIGTERM');server.close();}
