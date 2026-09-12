import {topology} from '../cube-topology/topology.mjs';
import {neighbors,random,solve,validateMap,validatePlacement,permutations} from '../single-face/model.mjs';
import {validate as validateCube} from '../complete-cube/model.mjs';
export const colors='ROYGBIV';

export function validateBoard(maps,truth=null,t=topology) {
  for(const face of t.faces)validateMap(maps[face],t.n);
  if(truth!==null) {
    const v=validateCube(truth,t);if(!v.valid)throw new Error(v.errors.join('; '));
    for(const f of t.faces)if(!validatePlacement(maps[f],v.faces[f].permutation,t.n))throw new Error('Region answer violation');
  }
  return true;
}
export function shape(map,n=7) {
  const sizes=Array(n).fill(0);map.forEach(v=>sizes[v]++);
  const leaves=map.filter((v,i)=>neighbors(i,n).filter(j=>map[j]===v).length===1).length;
  let perimeter=0;
  map.forEach((v,i)=>{perimeter+=4-neighbors(i,n).filter(j=>map[j]===v).length;});
  return {sizes,leaves,perimeter};
}
export function grow(planted,seed) {
  if(!Number.isInteger(seed)||seed<0||seed>4294967295)throw new Error('Expected uint32 seed');
  if(!Array.isArray(planted)||planted.length!==7||new Set(planted).size!==7||planted.some(x=>!Number.isInteger(x)||x<0||x>6))throw new Error('Invalid permutation');
  const rng=random(seed),map=Array(49).fill(-1),sizes=Array(7).fill(1);
  planted.forEach((c,r)=>map[r*7+c]=r);
  for(let step=7;step<49;step++) {
    const options=[];
    for(let cell=0;cell<49;cell++)if(map[cell]===-1) {
      const around=neighbors(cell,7);
      for(const region of new Set(around.map(i=>map[i]).filter(x=>x>=0))) {
        const contacts=around.filter(i=>map[i]===region).length;
        options.push({cell,region,weight:contacts**2/Math.sqrt(sizes[region])});
      }
    }
    let ticket=rng()*options.reduce((s,o)=>s+o.weight,0),chosen=options.at(-1);
    for(const o of options) {ticket-=o.weight;if(ticket<0){chosen=o;break;}}
    map[chosen.cell]=chosen.region;sizes[chosen.region]++;
  }
  return map;
}

// 126 exact-cover units at n=7, one option per canonical physical cell.
// Region keys include face; equal colors across faces never merge constraints.
export function countGlobal(maps,{limit=Infinity,maxNodes=2000000,t=topology}={}) {
  validateBoard(maps,null,t);
  if(!(limit===Infinity||Number.isSafeInteger(limit)&&limit>=1)||!Number.isSafeInteger(maxNodes)||maxNodes<1)throw new Error('Invalid limit');
  const covers=t.physicalCells.map(cell=>cell.faceCells.flatMap(r=>{
    const base=t.faces.indexOf(r.face)*3*t.n;
    return [base+r.row,base+t.n+r.col,base+2*t.n+maps[r.face][r.row*t.n+r.col]];
  }));
  const units=Array.from({length:18*t.n},(_,u)=>covers.flatMap((cs,i)=>cs.includes(u)?[i]:[]));
  const used=Array(units.length).fill(false),selected=[],solutions=[];
  let count=0,nodes=0,stopped=null;
  function visit() {
    if(nodes>=maxNodes){stopped='node-limit';return;}nodes++;
    let best=null;
    for(let u=0;u<units.length;u++)if(!used[u]) {
      const available=units[u].filter(i=>covers[i].every(j=>!used[j]));
      if(!available.length)return;
      if(best===null||available.length<best.length)best=available;
    }
    if(best===null) {
      count++;if(solutions.length<20)solutions.push(selected.map(i=>t.physicalCells[i].id).sort());
      if(count>=limit)stopped='solution-limit';return;
    }
    for(const i of best) {
      selected.push(i);covers[i].forEach(j=>used[j]=true);visit();
      covers[i].forEach(j=>used[j]=false);selected.pop();if(stopped)return;
    }
  }
  visit();return {count,exact:stopped===null,status:stopped??'exhausted',nodes,solutions};
}

// Independent oracle: join entire face solution domains, requiring equality of
// BOTH occupied and empty shared references. Does not use exact-cover units.
export function countByFaces(maps,t=topology) {
  const domains=t.faces.map(face=>({face,solutions:solve(maps[face],t.n)})).sort((a,b)=>a.solutions.length-b.solutions.length);
  let count=0;const solutions=[];
  function visit(k,states) {
    if(k===domains.length) {count++;if(solutions.length<20)solutions.push([...states].filter(([,v])=>v).map(([id])=>id).sort());return;}
    const {face,solutions:ps}=domains[k];
    for(const p of ps) {
      const next=new Map(states);let okay=true;
      for(let r=0;r<t.n&&okay;r++)for(let c=0;c<t.n;c++) {
        const id=t.faceCellToPhysical(face,r,c),value=p[r]===c;
        if(next.has(id)&&next.get(id)!==value){okay=false;break;}next.set(id,value);
      }
      if(okay)visit(k+1,next);
    }
  }
  visit(0,new Map());return {count,solutions};
}

export function continuity(maps,t=topology) {
  return t.edges.map(e=>{
    let matches=0;
    for(const id of e.cells) {
      const a=t.physicalToFaceCells(id).find(r=>r.face===e.a.face),b=t.physicalToFaceCells(id).find(r=>r.face===e.b.face);
      matches+=maps[a.face][a.row*t.n+a.col]===maps[b.face][b.row*t.n+b.col];
    }
    return {faces:[e.a.face,e.b.face],matches,total:t.n};
  });
}
export function alignColors(maps) {
  const out=structuredClone(maps),before=continuity(out),assignments=Object.fromEntries(topology.faces.map(f=>[f,[0,1,2,3,4,5,6]]));
  for(let pass=0;pass<10;pass++) {
    let changed=false;
    for(const face of topology.faces.slice(1)) {
      const score=Array.from({length:7},()=>Array(7).fill(0));
      for(const edge of topology.edges.filter(e=>e.a.face===face||e.b.face===face))for(const id of edge.cells) {
        const refs=topology.physicalToFaceCells(id),a=refs.find(r=>r.face===face),other=edge.a.face===face?edge.b.face:edge.a.face,b=refs.find(r=>r.face===other);
        score[maps[face][a.row*7+a.col]][out[other][b.row*7+b.col]]++;
      }
      const value=p=>p.reduce((s,c,i)=>s+score[i][c],0);
      let best=assignments[face],bestScore=value(best);
      for(const p of permutations()) {const s=value(p);if(s>bestScore){best=p;bestScore=s;}}
      if(best!==assignments[face]) {assignments[face]=[...best];out[face]=maps[face].map(i=>best[i]);changed=true;}
    }
    if(!changed)break;
  }
  return {maps:out,assignments,before,after:continuity(out)};
}
export function regionNet(maps) {
  const width=13,block=f=>[f.toUpperCase().padEnd(width),...Array.from({length:7},(_,r)=>maps[f].slice(r*7,r*7+7).map(x=>colors[x]).join(' '))];
  return [[null,'top',null,null],['left','front','right','back'],[null,'bottom',null,null]].map(row=>{
    const bs=row.map(f=>f?block(f):Array(8).fill(' '.repeat(width)));
    return Array.from({length:8},(_,i)=>bs.map(b=>b[i]).join('   ').trimEnd()).join('\n');
  }).join('\n\n')+'\n';
}

// Deliberate region edits: retain the answer, kill competing complete solutions.
export function refine(maps,truth,maxSteps=12) {
  validateBoard(maps,truth);
  if(!Number.isSafeInteger(maxSteps)||maxSteps<0)throw new Error('Invalid step limit');
  let current=structuredClone(maps),global=countGlobal(current);const history=[];
  if(!global.exact)throw new Error('Refinement requires an exact initial count');
  const occupied=new Set(truth);
  for(let step=0;step<maxSteps&&global.count>1;step++) {
    let best=null;
    for(const face of topology.faces)for(let cell=0;cell<49;cell++) {
      const physical=topology.faceCellToPhysical(face,Math.floor(cell/7),cell%7);
      if(occupied.has(physical))continue;
      const old=current[face][cell];
      for(const region of new Set(neighbors(cell,7).map(i=>current[face][i]).filter(x=>x!==old))) {
        const map=current[face].slice();map[cell]=region;
        try{validateMap(map);}catch{continue;}
        const s=shape(map);if(Math.min(...s.sizes)<2||Math.max(...s.sizes)>18||s.leaves>14)continue;
        const local=solve(map).length;if(local<2||local>100)continue;
        const candidate={...current,[face]:map};
        // A move of an occupied cell in a rival breaks that rival's region counts.
        if(!global.solutions.some(sol=>sol.includes(physical)))continue;
        const result=countGlobal(candidate);if(!result.exact||result.count>=global.count)continue;
        const score=topology.faces.reduce((total,f)=>total+(f===face?local:solve(current[f]).length),0);
        if(!best||result.count<best.global.count||result.count===best.global.count&&score<best.score)
          best={maps:candidate,global:result,score,edit:{face,cell,from:old,to:region,before:global.count,after:result.count}};
      }
    }
    if(!best)break;
    current=best.maps;global=best.global;history.push(best.edit);
  }
  validateBoard(current,truth);return {maps:current,global,history};
}
