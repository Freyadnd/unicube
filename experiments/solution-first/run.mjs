import {writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import os from 'node:os';
import {random,solve,permutations} from '../single-face/model.mjs';
import {generate,analyze} from './model.mjs';
const seeds = [1,42,137,2026,65537,8675309,20260912,314159265,2718281828,4294967295];
const perSeed = 1000, records=[], examples={}, runs=[];
permutations();
for (const variant of ['A','B','C']) for (const seed of seeds) {
  const rng=random(seed), run={variant,seed,accepted:perSeed,attempts:0,generationMs:0,solveMs:0,analysisMs:0};
  for (let index=0;index<perSeed;index++) {
    let t=performance.now(); const board=generate(rng,variant); run.generationMs+=performance.now()-t;
    run.attempts+=board.attempts;
    t=performance.now(); const solutions=solve(board.map); run.solveMs+=performance.now()-t;
    if (!solutions.some(p=>p.every((c,r)=>c===board.planted[r]))) throw new Error('Missing plant');
    const record={variant,seed,index,count:solutions.length,sizes:board.sizes,attempts:board.attempts};
    if (solutions.length>=2 && solutions.length<=10) {
      t=performance.now(); const a=analyze(board.map,solutions,board.planted); run.analysisMs+=performance.now()-t;
      // Full maps, solution sets, differing cells, and witnesses retained for every low-ambiguity board.
      record.map=board.map; record.planted=board.planted; record.solutions=solutions;
      record.analysis={...a,deduction:{unicorns:a.deduction.unicorns,unknown:a.deduction.unknown},
        afterEdge:a.afterEdge===null?null:{solved:a.afterEdge.solved,unicorns:a.afterEdge.unicorns,unknown:a.afterEdge.unknown}};
      const min=a.truths[a.plantedIndex].edge.minimum;
      const categories=[];
      if (solutions.length===2 && min===1) categories.push('twoSolutionEdge');
      if (solutions.length>=3 && solutions.length<=5 && min===1) categories.push('threeToFiveEdge');
      if (min>=2 && min<=3) categories.push('multipleEdgeClues');
      if (a.truths.every(t=>t.edge.minimum===null)) categories.push('notEdgeResolvable');
      for (const category of categories) if (!examples[category]) examples[category]={...record,analysis:a};
    }
    records.push(record);
  }
  runs.push(run); console.log(JSON.stringify(run));
}
const parameters={seeds,perSeed,n:7,variants:{A:'uniform directed frontier contact',B:'A, reject final singleton regions; resample permutation and growth',C:'frontier contact weight 1/currentRegionSize^2; no rejection'},prng:'Mulberry32',maxAttempts:100000};
writeFileSync(new URL('./results.json',import.meta.url),JSON.stringify({parameters,environment:{node:process.version,platform:os.platform(),arch:os.arch(),cpu:os.cpus()[0].model},runs,records})+'\n');
writeFileSync(new URL('./examples.json',import.meta.url),JSON.stringify(examples,null,2)+'\n');
