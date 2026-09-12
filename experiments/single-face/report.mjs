import {readFileSync, writeFileSync} from 'node:fs';
import {formatMap} from './model.mjs';
const d = JSON.parse(readFileSync(new URL('./results.json', import.meta.url)));
const examples = JSON.parse(readFileSync(new URL('./examples.json', import.meta.url)));
const table = (headers, rows) => [headers.join(' | '), headers.map(() => '---').join(' | '), ...rows.map(r => r.join(' | '))].join('\n');
const bins = [[0,0],[1,1],[2,10],[11,50],[51,100],[101,250],[251,500],[501,5040]];
const sumBin = (hist, lo, hi) => Object.entries(hist).reduce((s,[k,v]) => s + (+k >= lo && +k <= hi ? v : 0),0);
const counts = d.records.map(x=>x.count).sort((a,b)=>a-b);
const regionValues = Object.entries(d.sizes).flatMap(([size,count]) => Array(count).fill(+size)).sort((a,b)=>a-b);
const q = (a,p) => a[Math.floor(p*(a.length-1))];
const avg = a => a.reduce((s,x)=>s+x,0)/a.length;
const boards = ['unique','low','high'].map(key => {
  const e = examples[key];
  return `### ${key === 'unique' ? 'Unique solution' : key === 'low' ? 'Low ambiguity' : 'High ambiguity'}: ${e.count} solution(s)\n\nSample index ${e.index} (zero-based). Region sizes A–G: ${e.regionSizes.join(', ')}.\n\n\`\`\`text\n${formatMap(e.map)}\n\`\`\`\n\n${e.count <= 2 ? 'All solutions' : 'One example solution'} as **one-based columns for rows 1–7**: ${e.solutions.slice(0,e.count <= 2 ? 2 : 1).map(p=>'`'+p.map(c=>c+1).join(', ')+'`').join('; ')}.\n`;
}).join('\n');
const report = `# Single-face baseline experiment

## Scope and reproduction

Only a 7×7 face is modeled. Each cell has one region ID 0–6 (displayed A–G); all seven regions are nonempty and orthogonally connected. A placement has exactly one unicorn per row, column, and region. No adjacency rule, givens, cube topology, rendering, or gameplay is included. Uniqueness means one assignment in fixed coordinates, without symmetry reduction.

Run from the repository root with Node.js (no dependencies):

\`\`\`sh
node --test experiments/single-face/model.test.mjs
node experiments/single-face/run.mjs
node experiments/single-face/report.mjs
\`\`\`

Parameters: **10,000 maps**, one continuous **Mulberry32** PRNG stream with decimal seed **20260912**, seven uniformly selected distinct seed cells per map. At each of 42 growth steps, choose uniformly among directed occupied-to-empty orthogonal grid edges and give the empty endpoint the occupied endpoint's region. Maps are sampled with replacement; no deduplication, rejection for solution count, size balancing, or planted solution. Region sizes may differ. Connectivity is preserved because each addition touches its own region.

This distribution is **not uniform over connected partitions**: multiple frontier contacts increase a cell/region's chance of growing, and larger frontiers have more opportunities. All percentages below are empirical rates for this generator and seed, not estimates over all possible puzzle boards. A single seed run does not assess between-run variability.

Solver: precompute all 7! = 5,040 column permutations, then retain precisely those touching seven distinct region IDs. One-per-row is implicit in the representation; permutation columns enforce one-per-column. Seven distinct selected regions out of seven gives exactly one per region. Thus the enumeration is exhaustive. Map validation checks coverage, IDs, nonemptiness, and connectivity. The uniqueness API checks whether the full solution list has length one.

## Aggregate results

${table(['Outcome','Maps','Fraction'], Object.entries(d.categories).map(([k,v])=>[k,v,(100*v/10000).toFixed(2)+'%']))}

Mean solution count: **${avg(counts).toFixed(4)}**; median: **${q(counts,.5)}**; quartiles: **${q(counts,.25)}, ${q(counts,.75)}**; 90th/95th/99th percentiles: **${q(counts,.9)}, ${q(counts,.95)}, ${q(counts,.99)}**; range: **0–${counts.at(-1)}**. Quantiles use sorted index floor(p × (N−1)). Among the 4,728 satisfiable maps, 12 (${(1200/4728).toFixed(3)}%) are unique.

${table(['Solution count','Maps'], bins.map(([lo,hi])=>[lo===hi ? lo : lo+'–'+hi,sumBin(d.counts,lo,hi)]))}

Full exact solution-count histogram, per-map counts and sizes, pooled size histogram, and size histograms by sorted rank are saved in [results.json](single-face/results.json).

## Region sizes

There are 70,000 sampled regions. Their mean size is exactly 7 by construction of the partition total, **not** because sizes are balanced. Median ${q(regionValues,.5)}; quartiles ${q(regionValues,.25)} and ${q(regionValues,.75)}; range ${regionValues[0]}–${regionValues.at(-1)}.

${table(['Region size (cells)','Regions'], [[1,1],[2,3],[4,6],[7,10],[11,15],[16,20],[21,35]].map(([lo,hi])=>[lo===hi?lo:lo+'–'+hi,sumBin(d.sizes,lo,hi)]))}

${table(['Singleton region present?','Maps','Zero solutions','Unique'], Object.entries(d.bySingleton).map(([k,v])=>[k,v.maps,v.zero+' ('+(100*v.zero/v.maps).toFixed(2)+'%)',v.unique]))}

Singletons force placements and can conflict in a row or column. Their association with failure here is descriptive, not proof that they cause every failure. Five unique maps had no singleton region; uniqueness does not require a singleton in this sample.

## Runtime and verification

Measured on ${d.environment.cpu}, ${d.environment.platform}/${d.environment.arch}, Node ${d.environment.node}. One process, one measured run; no benchmark repetitions. Permutation setup ${d.timings.setupMs.toFixed(2)} ms; map generation ${d.timings.generationMs.toFixed(2)} ms; exhaustive solving including map validation ${d.timings.solvingMs.toFixed(2)} ms; total computation including statistics and saved-example validation ${d.timings.totalComputeMs.toFixed(2)} ms. Total excludes JSON file writes and process startup; timings vary by machine and run. Average solve time ${(d.timings.solvingMs/10000).toFixed(4)} ms/map.

Five test groups pass, including full reproduction and placement validation of all saved representative solutions. Independent brute force chooses arbitrary n-cell subsets of n² cells and checks explicit row/column/region counts: every connected labeled 2×2 partition, 100 generated 3×3 maps and 30 generated 4×4 maps. A second independent region-first cell search matches complete solution sets for 20 generated 7×7 maps. Other checks cover 5,040 stripe solutions, a connected unsatisfiable map, a known unique 2×2 case, invalid placements/maps, and reproducibility/connectivity of 1,000 generated maps. Exhaustively choosing seven arbitrary cells from 49 is unnecessary for every 7×7 map; the region-first oracle provides an independent full-size check.

## Representative boards

Selection was predetermined by code: first unique board; first board achieving the smallest positive count above one; first board achieving the maximum count. These illustrate outcomes, not typical difficulty. A–G represent seven distinct face-local colors. [examples.json](single-face/examples.json) stores these maps and **all** their solutions in zero-based coordinates.

${boards}
## Mathematical observations and limitations

- The seven-unicorn total is redundant once the seven row constraints hold. Column constraints reduce the search to permutations; region constraints select a subset of them.
- Connectivity alone guarantees neither existence nor uniqueness. Two singleton regions in one row already make a connected partition impossible to solve. The test fixture has six singleton regions on the first row and one connected remainder.
- Regions can be redundant: seven horizontal stripes (or vertical stripes) satisfy the region condition for every permutation, giving the theoretical maximum of 5,040 solutions. The sampled maximum of 576 is not an upper bound on this rule set.
- Region shape matters beyond size. For any subset of regions, their combined cells must touch at least as many rows and at least as many columns as there are regions (necessary Hall-type conditions). These separate row/column conditions do not by themselves establish a simultaneous placement; full enumeration remains the authority here.
- Uniqueness is possible, but very rare under this generator. The chosen unique example includes a forced singleton; the low-ambiguity example has two solutions differing only by swapping two columns between rows. Such small interchangeable choices may be structurally trivial rather than interesting deductions.
- Solution count measures ambiguity, not human difficulty, elegance, or fun. No human deduction model or playtesting was performed. These results do not establish that the proposed rules make a good puzzle.

## Recommended next experiment

Stay on a single face. Compare this baseline with (a) connected growth rejecting singleton regions and (b) solution-first connected growth seeded at the seven cells of a random permutation. The second construction guarantees at least the planted solution, without guaranteeing uniqueness. Run matched multi-seed samples, report rejection/acceptance costs and region-size distributions, and stratify counts by size and forced cells. Add a small explicit deduction model (forced cells and row/column/region elimination) to distinguish trivial uniqueness from puzzles requiring branching. Do not add cube topology until these controls clarify whether useful local ambiguity can be generated deliberately.
`;
writeFileSync(new URL('../results-single-face.md', import.meta.url), report);
