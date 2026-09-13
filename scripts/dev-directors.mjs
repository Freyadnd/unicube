import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const port=Number(process.env.PORT||5174);
const mime={'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json'};
const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost'),pathname=decodeURIComponent(url.pathname);
    if(pathname==='/'){res.writeHead(302,{Location:'/directors/'+url.search}).end();return;}
    const allowed=pathname==='/directors/'||['/directors/','/src/','/production/','/experiments/cube-topology/'].some(prefix=>pathname.startsWith(prefix));
    if(!allowed||pathname.split('/').some(part=>part.startsWith('.'))){res.writeHead(404).end('Not found');return;}
    const path=resolve(root,'.'+(pathname==='/directors/'?'/directors/index.html':pathname));
    if(!path.startsWith(root)){res.writeHead(404).end('Not found');return;}
    const bytes=await readFile(path);res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':'no-store'}).end(bytes);
  }catch{res.writeHead(404).end('Not found');}
});
server.listen(port,'127.0.0.1',()=>console.log(`Director's Cut: http://127.0.0.1:${port}/directors/`));
