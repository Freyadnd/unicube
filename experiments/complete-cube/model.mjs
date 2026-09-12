import {topology} from '../cube-topology/topology.mjs';
import {random} from '../single-face/model.mjs';

// One exact-cover option per PHYSICAL cell, covering every incident row/column.
export function createModel(t=topology) {
  const units=t.faces.flatMap(face=>['row','column'].flatMap(kind=>
    Array.from({length:t.n},(_,index)=>({face,kind,index}))));
  const covers=t.physicalCells.map(cell=>units.flatMap((u,i)=>cell.faceCells.some(r=>
    r.face===u.face && (u.kind==='row'?r.row:r.col)===u.index)?[i]:[]));
  const options=units.map((_,u)=>covers.flatMap((cs,i)=>cs.includes(u)?[i]:[]));
  function search(seed,{maxNodes=1000000,limit=1}={}) {
    if(!Number.isInteger(seed)||seed<0||seed>4294967295) throw new Error('Expected uint32 seed');
    if(!Number.isSafeInteger(maxNodes)||maxNodes<1||!Number.isSafeInteger(limit)||limit<1) throw new Error('Invalid search limits');
    const rng=random(seed), used=Array(units.length).fill(false), selected=[], solutions=[];
    const stats={nodes:0,deadEnds:0,branches:0}; let capped=false;
    function visit() {
      if(stats.nodes>=maxNodes) {capped=true;return;}
      stats.nodes++;
      let best=[],minimum=Infinity;
      for(let u=0;u<units.length;u++) if(!used[u]) {
        const candidates=options[u].filter(i=>covers[i].every(v=>!used[v]));
        if(!candidates.length) {stats.deadEnds++;return;}
        if(candidates.length<minimum) {minimum=candidates.length;best=[candidates];}
        else if(candidates.length===minimum) best.push(candidates);
      }
      if(!best.length) {solutions.push(selected.map(i=>t.physicalCells[i].id).sort());return;}
      const candidates=best[Math.floor(rng()*best.length)].slice();
      for(let i=candidates.length-1;i>0;i--) {const j=Math.floor(rng()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
      for(const i of candidates) {
        stats.branches++;selected.push(i);covers[i].forEach(u=>used[u]=true);
        visit();covers[i].forEach(u=>used[u]=false);selected.pop();
        if(capped||solutions.length>=limit)return;
      }
    }
    visit();
    return {solutions,stats,status:capped?'node-limit':solutions.length>=limit?'solution-limit':'exhausted'};
  }
  return {search,unitCount:units.length,optionCount:covers.length};
}
const model=createModel();
export function generate(seed) {
  const result=model.search(seed);
  if(!result.solutions.length) throw new Error(`No solution: ${result.status}`);
  return {seed,cells:result.solutions[0],stats:result.stats};
}

// Validator deliberately scans face grids rather than reusing exact-cover data.
export function validate(cells,t=topology) {
  const errors=[];
  if(!Array.isArray(cells)) return {valid:false,errors:['Expected array of canonical IDs']};
  const known=new Set(t.physicalCells.map(c=>c.id)), occupied=new Set(cells);
  if(occupied.size!==cells.length) errors.push('Duplicate physical IDs');
  if(cells.some(id=>!known.has(id))) errors.push('Unknown physical ID');
  const faces={};
  for(const face of t.faces) {
    const rows=Array(t.n).fill(0),columns=Array(t.n).fill(0),permutation=Array(t.n).fill(null);
    for(let r=0;r<t.n;r++) for(let c=0;c<t.n;c++) if(occupied.has(t.faceCellToPhysical(face,r,c))) {
      rows[r]++;columns[c]++;permutation[r]=c;
    }
    const total=rows.reduce((a,b)=>a+b,0);
    if(total!==t.n||rows.some(x=>x!==1)||columns.some(x=>x!==1))errors.push(`${face}: row/column/total violation`);
    faces[face]={rows,columns,total,permutation};
  }
  return {valid:!errors.length,errors,faces};
}

export function measure(cells,t=topology) {
  const check=validate(cells,t);if(!check.valid)throw new Error(check.errors.join('; '));
  const occupied=new Set(cells),counts=[0,0,0,0],links=new Map(t.faces.map(f=>[f,new Set()]));
  for(const id of cells) {
    const refs=t.physicalToFaceCells(id);counts[refs.length]++;
    for(const a of refs) for(const b of refs) if(a.face!==b.face)links.get(a.face).add(b.face);
  }
  const unseen=new Set(t.faces),components=[];
  while(unseen.size) {
    const seen=new Set([unseen.values().next().value]);
    for(const f of seen) {unseen.delete(f);for(const g of links.get(f))seen.add(g);}
    components.push(seen.size);
  }
  const edgeOccupancy=t.edges.map(e=>({id:e.id,unicorns:e.cells.filter(id=>occupied.has(id)).length,
    interiorUnicorns:e.interiorCells.filter(id=>occupied.has(id)).length}));
  return {distinct:cells.length,interior:counts[1],edge:counts[2],corner:counts[3],shared:counts[2]+counts[3],
    incidences:Object.values(check.faces).reduce((s,f)=>s+f.total,0),
    coupledFacePairs:[...links.values()].reduce((s,x)=>s+x.size,0)/2,components:components.sort((a,b)=>b-a),
    sharedPerFace:Object.fromEntries(t.faces.map(f=>[f,cells.filter(id=>{const r=t.physicalToFaceCells(id);return r.length>1&&r.some(x=>x.face===f);}).length])),
    edgeOccupancy,permutations:Object.fromEntries(t.faces.map(f=>[f,check.faces[f].permutation]))};
}
export function formatNet(cells,t=topology) {
  const occupied=new Set(cells),width=Math.max(13,t.n*2-1);
  const block=f=>[f.toUpperCase().padEnd(width),...Array.from({length:t.n},(_,r)=>
    Array.from({length:t.n},(_,c)=>occupied.has(t.faceCellToPhysical(f,r,c))?'U':'.').join(' ').padEnd(width))];
  return [[null,'top',null,null],['left','front','right','back'],[null,'bottom',null,null]].map(row=>{
    const blocks=row.map(f=>f?block(f):Array(t.n+1).fill(' '.repeat(width)));
    return Array.from({length:t.n+1},(_,i)=>blocks.map(b=>b[i]).join('   ').trimEnd()).join('\n');
  }).join('\n\n')+'\n';
}
