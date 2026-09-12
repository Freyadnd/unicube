import {readFileSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {topology as t} from '../cube-topology/topology.mjs';
import {solve,random} from '../single-face/model.mjs';
import {formatNet} from '../complete-cube/model.mjs';
import {grow,shape,countGlobal,validateBoard,alignColors,regionNet,refine} from './model.mjs';
const sources=JSON.parse(readFileSync(new URL('../complete-cube/examples.json',import.meta.url)));
const pools={},poolStats=[],trials=[],examples={},start=performance.now();
for(const sourceName of ['high','moderate']) {
 const source=sources[sourceName];pools[sourceName]={};
 for(const [fi,face] of t.faces.entries()) {
   const planted=source.metrics.permutations[face],pool=[];let attempts=0,shapeRejected=0,logicRejected=0;
   while(pool.length<12&&attempts<30000) {
     const seed=(Math.imul(source.seed+1,2654435761)+fi*100000+attempts)>>>0;attempts++;
     const map=grow(planted,seed),s=shape(map);
     if(Math.min(...s.sizes)<2||Math.max(...s.sizes)>18||s.leaves>14){shapeRejected++;continue;}
     const ps=solve(map);
     // Necessary for global uniqueness: no interior-only alternative can survive.
     const boundaryMatches=ps.filter(p=>Array.from({length:49},(_,i)=>i).filter(i=>i<7||i>=42||i%7===0||i%7===6).every(i=>(p[Math.floor(i/7)]===i%7)===(planted[Math.floor(i/7)]===i%7))).length;
     if(ps.length<2||ps.length>100||boundaryMatches!==1){logicRejected++;continue;}
     pool.push({seed,map,shape:s,localCount:ps.length});
   }
   if(pool.length<12)throw new Error('Pool search exhausted');
   pools[sourceName][face]=pool;poolStats.push({sourceName,face,attempts,shapeRejected,logicRejected,accepted:pool.length});
   console.log(poolStats.at(-1));
 }
 const rng=random(source.seed);
 for(let index=0;index<100;index++) {
   const selected=Object.fromEntries(t.faces.map(face=>[face,pools[sourceName][face][Math.floor(rng()*12)]]));
   const maps=Object.fromEntries(t.faces.map(f=>[f,selected[f].map]));
   validateBoard(maps,source.cells);
   const global=countGlobal(maps);if(!global.exact)throw new Error('Full count exceeded budget');
   const localCounts=Object.fromEntries(t.faces.map(f=>[f,selected[f].localCount]));
   const score=Object.values(localCounts).reduce((s,x)=>s+x,0);
   const record={sourceName,sourceSeed:source.seed,index,regionSeeds:Object.fromEntries(t.faces.map(f=>[f,selected[f].seed])),localCounts,globalCount:global.count,nodes:global.nodes,score};trials.push(record);
   const candidate={...record,truth:source.cells,maps,global};
   if(global.count===1) {
     if(!examples.A)examples.A=candidate;
     else if(!examples.B)examples.B=candidate;
     if(!examples.C||score<examples.C.score)examples.C=candidate;
   } else if(!examples.D||global.count<examples.D.globalCount)examples.D=candidate;
 }
 console.log(sourceName,'unique',trials.filter(r=>r.sourceName===sourceName&&r.globalCount===1).length);
}
const refinementTrials=[];
for(const trial of trials.toSorted((a,b)=>a.globalCount-b.globalCount).slice(0,12)) {
 const source=sources[trial.sourceName];
 const initialMaps=Object.fromEntries(t.faces.map(f=>[f,grow(source.metrics.permutations[f],trial.regionSeeds[f])]));
 const r=refine(initialMaps,source.cells);
 refinementTrials.push({sourceName:trial.sourceName,index:trial.index,initialCount:trial.globalCount,finalCount:r.global.count,localCounts:Object.fromEntries(t.faces.map(f=>[f,solve(r.maps[f]).length])),history:r.history});
 console.log('refined',trial.sourceName,trial.index,trial.globalCount,'->',r.global.count,'edits',r.history.length);
 if(r.global.exact&&r.global.count===1) {
   const localCounts=Object.fromEntries(t.faces.map(f=>[f,solve(r.maps[f]).length]));
   const score=Object.values(localCounts).reduce((s,x)=>s+x,0);
   const e={...trial,localCounts,score,globalCount:r.global.count,truth:source.cells,maps:r.maps,global:r.global,refinement:r.history};
   if(!examples.A)examples.A=e;
   else if(!examples.B)examples.B=e;
   else if(!examples.C||score<examples.C.score)examples.C=e;
 }
}
for(const [key,example] of Object.entries(examples)) {
 const color=alignColors(example.maps);example.originalMaps=example.maps;example.maps=color.maps;example.colorAlignment={...color,maps:undefined};
 example.regionShapes=Object.fromEntries(t.faces.map(f=>[f,shape(example.maps[f])]));
 validateBoard(example.maps,example.truth);
 const recheck=countGlobal(example.maps);if(!recheck.exact||recheck.count!==example.globalCount)throw new Error('Recolor changed count');
}
writeFileSync(new URL('./results.json',import.meta.url),JSON.stringify({parameters:{sourceFile:'experiments/complete-cube/examples.json',sourceNames:['high','moderate'],poolSize:12,perSourceTrials:100,maxFaceAttempts:30000,maxRegionSize:18,minRegionSize:2,maxLeaves:14,minLocalSolutions:2,maxLocalSolutions:100,boundaryTruthCompletions:1},poolStats,trials,refinementTrials,elapsedMs:performance.now()-start},null,2)+'\n');
writeFileSync(new URL('./pools.json',import.meta.url),JSON.stringify(pools,null,2)+'\n');
writeFileSync(new URL('./examples.json',import.meta.url),JSON.stringify(examples,null,2)+'\n');
writeFileSync(new URL('./examples.txt',import.meta.url),Object.entries(examples).map(([k,e])=>`${k}: regions\n${regionNet(e.maps)}\nAnswer overlay (U / .)\n${formatNet(e.truth)}`).join('\n')+'\n');
console.log(Object.fromEntries(Object.entries(examples).map(([k,e])=>[k,{source:e.sourceName,index:e.index,local:e.localCounts,global:e.globalCount}])));
