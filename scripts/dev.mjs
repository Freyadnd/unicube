import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,extname,sep} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url)),port=Number(process.env.PORT||5173);
const mime={'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json'};
const server=createServer(async(req,res)=>{try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const path=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!path.startsWith(root)||pathname.split('/').some(s=>s.startsWith('.'))||!['/index.html','/src/','/experiments/'].some(p=>pathname==='/'||pathname===p||p.endsWith('/')&&pathname.startsWith(p))){res.writeHead(404).end('Not found');return;}
  const body=await readFile(path);res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);
}catch{res.writeHead(404).end('Not found');}});
server.on('error',error=>{console.error(error.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`UNICUBE Board C: http://127.0.0.1:${port}/`));
