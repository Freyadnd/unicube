import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {build} from 'esbuild';

const root=fileURLToPath(new URL('../',import.meta.url)),out=resolve(root,'dist/directors');
await mkdir(out,{recursive:true});
const js=await build({entryPoints:[resolve(root,'directors/main.mjs')],outfile:resolve(out,'app.js'),bundle:true,format:'esm',platform:'browser',target:'es2022',metafile:true,legalComments:'none'});
await build({entryPoints:[resolve(root,'directors/style.css')],outfile:resolve(out,'style.css'),bundle:true,loader:{'.css':'css'},legalComments:'none'});
const html=(await readFile(resolve(root,'directors/index.html'),'utf8')).replace('./main.mjs','./app.js');
await writeFile(resolve(out,'index.html'),html);
const verified=JSON.parse(await readFile(resolve(root,'directors/constellations.json'),'utf8'));
const runtime={formatVersion:verified.formatVersion,constellations:verified.constellations.map(({id,maps,fixed,startFace,metadata})=>({
  id,maps,fixed,startFace,metadata:{globalSolutionCount:metadata.globalSolutionCount,
    localSolutionCounts:metadata.localSolutionCounts,
    independentLocalCombinationCount:metadata.independentLocalCombinationCount}
}))};
await writeFile(resolve(out,'constellations.json'),JSON.stringify(runtime));
const inputs=Object.keys(js.metafile.inputs);
const forbidden=['single-face/model','rainbow-cube/model','solution-first','solver-worker','generate.mjs','analysis.mjs'];
if(forbidden.some(term=>inputs.some(path=>path.includes(term))))throw Error(`Offline solver/generator entered Director's Cut bundle: ${inputs.join(', ')}`);
console.log(`Director's Cut static output: ${out}`);
console.log(`Runtime graph: ${inputs.join(', ')}`);
