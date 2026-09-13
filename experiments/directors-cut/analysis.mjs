import {topology} from '../cube-topology/topology.mjs';
import {solve} from '../single-face/model.mjs';
import {countGlobal,validateBoard,shape} from '../rainbow-cube/model.mjs';
import {propagation} from '../small-cubes/analyze.mjs';

export const faces=topology.faces;

// Independent face domains are joined only through matching canonical boundary
// occupancy. This is arc consistency, not a proof of global uniqueness.
export function boundaryPropagation(maps,localDomains=faces.map(face=>solve(maps[face]))) {
  const domains=localDomains.map(domain=>domain.slice());
  const pairs=[];
  for(let a=0;a<6;a++)for(let b=a+1;b<6;b++){
    const shared=topology.physicalCells.flatMap(cell=>{
      const x=cell.faceCells.find(r=>r.face===faces[a]),y=cell.faceCells.find(r=>r.face===faces[b]);
      return x&&y?[[x,y]]:[];
    });
    if(shared.length)pairs.push({a,b,shared});
  }
  const signature=(placement,refs,side)=>refs.map(pair=>{
    const r=pair[side];return placement[r.row]===r.col?'1':'0';
  }).join('');
  let rounds=0,removed=0;
  for(;;){
    let changed=0;
    for(const {a,b,shared} of pairs)for(const [from,to,side] of [[a,b,0],[b,a,1]]){
      const supported=new Set(domains[to].map(p=>signature(p,shared,1-side)));
      const next=domains[from].filter(p=>supported.has(signature(p,shared,side)));
      changed+=domains[from].length-next.length;domains[from]=next;
    }
    if(!changed)break;
    rounds++;removed+=changed;
  }
  return {rounds,removed,remaining:domains.map(d=>d.length),solved:domains.every(d=>d.length===1)};
}

export function analyzeConstellation({maps,truth,fixed=[]}) {
  validateBoard(maps,truth);
  const global=countGlobal(maps,{required:fixed});
  if(!global.exact)throw Error(`Global count incomplete: ${global.status}`);
  const domains=faces.map(face=>solve(maps[face]).filter(p=>fixed.every(id=>{
    const ref=topology.physicalToFaceCells(id).find(r=>r.face===face);
    return !ref||p[ref.row]===ref.col;
  })));
  const localSolutionCounts=domains.map(d=>d.length);
  const independentLocalCombinationCount=localSolutionCounts.reduce((n,x)=>n*BigInt(x),1n).toString();
  const crossFace=boundaryPropagation(maps,domains);
  const deduction=propagation({n:7,maps,truth,fixed,excluded:[]});
  const regionShapes=faces.map(face=>shape(maps[face]));
  return {globalSolutionCount:global.count,globalNodes:global.nodes,localSolutionCounts,
    independentLocalCombinationCount,crossFace,deduction,
    minRegionSize:Math.min(...regionShapes.flatMap(s=>s.sizes)),
    maxRegionSize:Math.max(...regionShapes.flatMap(s=>s.sizes)),
    maxFaceLeaves:Math.max(...regionShapes.map(s=>s.leaves)),numberOfGivens:fixed.length};
}

// These are transparent design filters, not a claim to measure human difficulty.
// The range limits extreme local branching; boundary pruning ensures the shared
// surface removes at least one face-local alternative on multiple faces.
export function quality(meta) {
  const product=BigInt(meta.independentLocalCombinationCount);
  const reasons=[];
  if(meta.globalSolutionCount!==1)reasons.push('not globally unique');
  if(meta.localSolutionCounts.some(n=>n<2))reasons.push('locally determined face');
  if(meta.localSolutionCounts.some(n=>n>100))reasons.push('face domain over 100');
  if(product<1_000_000n||product>100_000_000_000n)reasons.push('local product outside 1m–100b');
  if(meta.crossFace.removed<2||meta.crossFace.remaining.filter((n,i)=>n<meta.localSolutionCounts[i]).length<2)reasons.push('weak pairwise boundary propagation');
  if(meta.minRegionSize<2||meta.maxRegionSize>18||meta.maxFaceLeaves>14)reasons.push('region shape guard');
  if(meta.numberOfGivens>2)reasons.push('too many givens');
  return {accepted:reasons.length===0,reasons};
}
