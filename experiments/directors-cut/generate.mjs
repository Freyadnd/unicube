import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {topology} from '../cube-topology/topology.mjs';
import {random} from '../single-face/model.mjs';
import {countGlobal,refine,validateBoard} from '../rainbow-cube/model.mjs';
import {analyzeConstellation,quality} from './analysis.mjs';

const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url)));
const pools=read('../rainbow-cube/pools.json'),answers=read('../complete-cube/examples.json');
const searchSeed=20260913,attemptLimit=300,refinementLimit=26,target=12;
const rng=random(searchSeed),sources=['moderate','high'],candidates=[],started=performance.now();
const stats={searchSeed,attemptLimit,refinementLimit,target,assemblies:0,exactAssemblies:0,
  assemblyCounts:{},refinementsAttempted:0,refinementsUnique:0,qualityRejected:{},duplicateRejected:0,
  growthSource:'experiments/rainbow-cube/pools.json',sourceAnswers:sources,
  initialSolverMs:0,refinementMs:0,analysisMs:0};
const canonical=maps=>topology.faces.map(face=>{
  const labels=new Map;return maps[face].map(v=>{if(!labels.has(v))labels.set(v,labels.size);return labels.get(v);}).join('');
}).join('|');
const old=read('../rainbow-cube/examples.json');
const seen=new Set(Object.values(old).map(x=>canonical(x.maps)));

for(let i=0;i<attemptLimit;i++){
  const source=sources[i%sources.length],truth=answers[source].cells;
  const choices=Object.fromEntries(topology.faces.map(face=>[face,Math.floor(rng()*pools[source][face].length)]));
  const maps=Object.fromEntries(topology.faces.map(face=>[face,pools[source][face][choices[face]].map]));
  const timer=performance.now(),global=countGlobal(maps);stats.initialSolverMs+=performance.now()-timer;stats.assemblies++;
  if(!global.exact)continue;
  stats.exactAssemblies++;const bucket=global.count===1?'1':global.count<=4?'2–4':global.count<=12?'5–12':global.count<=50?'13–50':'>50';
  stats.assemblyCounts[bucket]=(stats.assemblyCounts[bucket]||0)+1;
  if(global.count<=50)candidates.push({attempt:i,source,truth,maps,choices,initialCount:global.count});
}

const selected=[],rejections=[];
// Balance the two known planted answers; all face maps were independently
// grown from those answers, and every final board is exhaustively recounted.
const bySource=sources.map(source=>candidates.filter(c=>c.source===source).sort((a,b)=>a.initialCount-b.initialCount||a.attempt-b.attempt).slice(0,refinementLimit/2));
const shortlist=Array.from({length:refinementLimit/2},(_,i)=>sources.map((_,j)=>bySource[j][i]).filter(Boolean)).flat();
for(const item of shortlist){
  stats.refinementsAttempted++;
  const timer=performance.now(),result=item.initialCount===1?{maps:item.maps,global:countGlobal(item.maps),history:[]}:refine(item.maps,item.truth,6);
  stats.refinementMs+=performance.now()-timer;
  if(!result.global.exact||result.global.count!==1){rejections.push({attempt:item.attempt,reason:'refinement did not reach one',count:result.global.count});continue;}
  stats.refinementsUnique++;
  const key=canonical(result.maps);
  if(seen.has(key)){stats.duplicateRejected++;rejections.push({attempt:item.attempt,reason:'same region partition'});continue;}
  const checkStart=performance.now(),metadata=analyzeConstellation({maps:result.maps,truth:item.truth,fixed:[]});
  stats.analysisMs+=performance.now()-checkStart;
  const q=quality(metadata);
  if(!q.accepted){for(const reason of q.reasons)stats.qualityRejected[reason]=(stats.qualityRejected[reason]||0)+1;rejections.push({attempt:item.attempt,reason:q.reasons.join('; ')});continue;}
  validateBoard(result.maps,item.truth);
  const final=countGlobal(result.maps);
  if(!final.exact||final.count!==1||final.solutions[0].join('|')!==item.truth.slice().sort().join('|'))throw Error(`Independent saved-truth check failed at ${item.attempt}`);
  seen.add(key);
  const startFace=topology.faces[metadata.localSolutionCounts.indexOf(Math.min(...metadata.localSolutionCounts))];
  const id=String(10000+item.attempt);
  selected.push({id,maps:result.maps,fixed:[],startFace,truth:item.truth,metadata,
    provenance:{searchSeed,attempt:item.attempt,source:item.source,sourceSolutionSeed:answers[item.source].seed,
      poolChoices:item.choices,initialGlobalCount:item.initialCount,refinement:result.history,
      partitionHash:createHash('sha256').update(key).digest('hex').slice(0,12)}});
  console.log(`#${id} global 1 local [${metadata.localSolutionCounts.join(', ')}] product ${metadata.independentLocalCombinationCount} givens 0 boundary ${metadata.crossFace.removed} removed / ${metadata.crossFace.rounds} rounds`);
  if(selected.length>=target)break;
}
stats.accepted=selected.length;stats.rejected=stats.assemblies-stats.accepted;stats.acceptanceRate=stats.accepted/stats.assemblies;
stats.elapsedMs=performance.now()-started;stats.rejections=rejections;
if(selected.length<10)throw Error(`Only ${selected.length} passed; report stats before broadening search: ${JSON.stringify(stats)}`);
mkdirSync(new URL('../../directors/',import.meta.url),{recursive:true});
writeFileSync(new URL('../../directors/constellations.json',import.meta.url),JSON.stringify({formatVersion:1,searchSeed,constellations:selected},null,2)+'\n');
writeFileSync(new URL('./search-report.json',import.meta.url),JSON.stringify(stats,null,2)+'\n');
console.log(`SEARCH ${stats.assemblies} assemblies, ${stats.refinementsAttempted} refinements, ${stats.accepted} accepted, ${stats.elapsedMs.toFixed(0)} ms`);
