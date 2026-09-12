import {writeFileSync} from 'node:fs';
import os from 'node:os';
import {performance} from 'node:perf_hooks';
import {generate,measure,formatNet} from './model.mjs';
const records=[],batches=[];
for(let batch=0;batch<10;batch++) {
  const start=performance.now();let searchMs=0,validationMs=0;
  for(let index=0;index<1000;index++) {
    const seed=(Math.imul(batch,2654435761)+index)>>>0;
    let at=performance.now();const r=generate(seed);searchMs+=performance.now()-at;
    at=performance.now();const metrics=measure(r.cells);validationMs+=performance.now()-at;
    if(metrics.incidences!==42||metrics.interior+2*metrics.edge+3*metrics.corner!==42||
      metrics.edge+3*metrics.corner!==12||metrics.distinct!==30+metrics.corner||metrics.edgeOccupancy.some(e=>e.unicorns!==1))throw new Error('Invariant failure');
    records.push({batch,index,...r,metrics});
  }
  batches.push({batch,searchMs,validationMs,totalMs:performance.now()-start});
  console.log(batches.at(-1));
}
const sharing=records.map(r=>r.metrics.shared).sort((a,b)=>a-b);
const targets={few:sharing[0],moderate:sharing[4999],high:sharing.at(-1)};
const examples=Object.fromEntries(Object.entries(targets).map(([key,target])=>[key,records.find(r=>r.metrics.shared===target)]));
writeFileSync(new URL('./results.json',import.meta.url),JSON.stringify({parameters:{samples:10000,batches:10,perBatch:1000,seedFormula:'(imul(batch,2654435761)+index) >>> 0',maxNodes:1000000,selection:'random MRV tie; shuffled cell options; first global exact cover'},environment:{node:process.version,cpu:os.cpus()[0].model,platform:os.platform(),arch:os.arch()},batches,records})+'\n');
writeFileSync(new URL('./examples.json',import.meta.url),JSON.stringify(examples,null,2)+'\n');
writeFileSync(new URL('./examples.txt',import.meta.url),Object.entries(examples).map(([key,r])=>`${key.toUpperCase()} SHARING — seed ${r.seed}\n${formatNet(r.cells)}\n${JSON.stringify(r.metrics.permutations,null,2)}`).join('\n\n')+'\n');
