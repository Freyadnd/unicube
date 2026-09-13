// Offline only. Deterministic solution-first growth; never imported by the game.
import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createTopology} from '../cube-topology/topology.mjs';
import {createModel,validate} from '../complete-cube/model.mjs';
import {random,neighbors,solve,validateMap} from '../single-face/model.mjs';
import {countGlobal} from '../rainbow-cube/model.mjs';
import {localCount,propagation} from './analyze.mjs';

function grow(p,n,seed,singleton=-1){
  const rng=random(seed),map=Array(n*n).fill(-1),sizes=Array(n).fill(1);
  p.forEach((c,r)=>map[r*n+c]=r);
  while(map.includes(-1)){
    const options=[];
    map.forEach((v,i)=>{if(v!==-1)return;for(const region of new Set(neighbors(i,n).map(j=>map[j]).filter(v=>v>=0&&v!==singleton))){options.push({i,region,w:1/Math.sqrt(sizes[region])});}});
    if(!options.length)return null;
    let ticket=rng()*options.reduce((s,o)=>s+o.w,0),pick=options.at(-1);
    for(const o of options){ticket-=o.w;if(ticket<0){pick=o;break;}}
    map[pick.i]=pick.region;sizes[pick.region]++;
  }return map;
}
const out=[],stats=[];
for(const n of [3,4,5]){
  const start=performance.now(),t=createTopology(n),solutionSeed=n===3?3:1700+n;
  const truth=createModel(t).search(solutionSeed).solutions[0],check=validate(truth,t);
  if(!check.valid)throw Error('Invalid planted cube');
  let selected=null,attempts=0,valid=0,unique=0,rejectedTeaching=0;
  for(let candidate=0;candidate<20000;candidate++){
    attempts++;const maps={};for(const [i,face] of t.faces.entries())maps[face]=grow(check.faces[face].permutation,n,170000+n*20000+candidate*6+i,n===3&&face==='front'?1:-1);
    if(Object.values(maps).some(m=>!m))continue;
    for(const map of Object.values(maps))validateMap(map,n);valid++;
    const board={id:`CUBE${n}`,n,maps,truth,activeFaces:t.faces,fixed:[],excluded:[],solutionSeed,generationSeed:170000+n*20000+candidate*6};
    if(n===3){
      board.fixed=['0,0,1','0,1,0','1,0,0','1,2,1'];
      const interactiveFalse=['1,0,2','2,1,2','2,0,1','2,2,2','0,2,0'];
      board.excluded=t.physicalCells.filter(c=>!truth.includes(c.id)&&!interactiveFalse.includes(c.id)).map(c=>c.id);
      if(localCount(board,'right')!==2||localCount(board,'top')!==2||localCount(board,'right',board.fixed,[...board.excluded,'2,1,2'])!==1||localCount(board,'top',board.fixed,[...board.excluded,'2,2,2'])!==1){rejectedTeaching++;continue;}
    }else{
      // Pick footholds by reduction of independent face ambiguity, then retain
      // enough unplaced unicorns to avoid an empty-cube workload.
      const remainingTarget=n===4?8:13;
      while(truth.length-board.fixed.length>remainingTarget){
        const before=t.faces.map(f=>localCount(board,f));
        const choices=truth.filter(id=>!board.fixed.includes(id)).map(id=>{
          const after=t.faces.map(f=>localCount(board,f,[...board.fixed,id]));
          return {id,score:before.reduce((s,v,i)=>s+Math.log2(v/after[i]),0),shared:t.physicalToFaceCells(id).length};
        }).sort((a,b)=>b.score-a.score||b.shared-a.shared||a.id.localeCompare(b.id));
        board.fixed.push(choices[0].id);
      }
    }
    const result=countGlobal(maps,{t,required:board.fixed,excluded:board.excluded});
    if(!result.exact||result.count!==1)continue;unique++;
    if(JSON.stringify(result.solutions[0].sort())!==JSON.stringify([...truth].sort()))throw Error('Truth mismatch');
    board.metrics={global:result.count,local:Object.fromEntries(t.faces.map(f=>[f,localCount(board,f)])),...propagation(board)};
    // 5x5 should retain substantial face-local uncertainty for cross-face play.
    if(n===5&&Object.values(board.metrics.local).filter(x=>x>1).length<3)continue;
    selected=board;break;
  }
  if(!selected)throw Error(`No fixture for n=${n} after ${attempts}`);
  if(n===3)selected.tutorial=[
    {target:'1,0,2',state:1,unit:['1,0,2','1,1,2'],text:'one 🦄 in every rainbow · not here',proof:'front center is a singleton rainbow; its column excludes the bottom-middle star'},
    {target:'1,1,2',state:2,unit:['1,1,2'],text:'only one star left · double-tap it',proof:'front singleton rainbow'},
    {target:'2,1,2',state:1,unit:['1,1,2','2,1,2'],text:'one edge · two faces',edge:['front','right'],camera:{x:.25,y:-.85},proof:'front middle row already has its unicorn'},
    {target:'2,1,1',state:2,unit:['2,1,2','2,1,1'],text:'a clue can cross the edge',camera:{x:.25,y:-.85},proof:'right middle row has one remaining possible cell after the shared exclusion'},
    {target:'2,0,2',state:2,unit:['2,0,2','2,0,1'],text:'one 🦄 per column',proof:'right middle column is occupied; bottom row now has one remaining cell'},
    {target:'2,2,2',state:1,unit:['2,2,2'],text:'one corner · three faces',corner:'2,2,2',camera:{x:.50,y:-.55},proof:'right left column already contains the bottom unicorn'},
    {target:'0,2,2',state:2,unit:['0,2,2','2,2,2'],text:'clues travel around the cube',camera:{x:.70,y:-.40},proof:'top front row has one remaining cell after the shared corner exclusion'}
  ];
  out.push(selected);stats.push({n,solutionSeed,candidates:attempts,connectedAndPlanted:valid,uniqueCandidates:unique,rejectedTeaching,elapsedMs:Math.round(performance.now()-start),references:6*n*n,physical:t.physicalCells.length,incidences:[1,2,3].map(k=>t.physicalCells.filter(c=>c.faceCells.length===k).length),fixed:selected.fixed.length,excluded:selected.excluded.length,...selected.metrics});
}
fs.writeFileSync(new URL('examples.json',import.meta.url),JSON.stringify(out,null,2)+'\n');
fs.writeFileSync(new URL('search-stats.json',import.meta.url),JSON.stringify(stats,null,2)+'\n');
// Independent reload, exact exhaustion, and map/truth verification.
for(const board of JSON.parse(fs.readFileSync(new URL('examples.json',import.meta.url)))){
 const t=createTopology(board.n),r=countGlobal(board.maps,{t,required:board.fixed,excluded:board.excluded});
 if(!r.exact||r.count!==1||JSON.stringify(r.solutions[0].sort())!==JSON.stringify([...board.truth].sort()))throw Error('Saved fixture verification failed');
}
console.log(JSON.stringify(stats,null,2));
