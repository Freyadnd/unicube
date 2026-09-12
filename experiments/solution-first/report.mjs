import {readFileSync,writeFileSync} from 'node:fs';
import {formatMap} from '../single-face/model.mjs';
const data=JSON.parse(readFileSync(new URL('./results.json',import.meta.url)));
const examples=JSON.parse(readFileSync(new URL('./examples.json',import.meta.url)));
const sum=(xs,f=x=>x)=>xs.reduce((s,x)=>s+f(x),0);
const pct=(x,n)=>n?`${(100*x/n).toFixed(2)}%`:'n/a';
const mean=xs=>xs.length?(sum(xs)/xs.length).toFixed(2):'n/a';
const hist=xs=>xs.reduce((h,x)=>(h[x]=(h[x]??0)+1,h),{});
const table=(heads,rows)=>[heads.join(' | '),heads.map(()=>'---').join(' | '),...rows.map(r=>r.join(' | '))].join('\n');
const coord=i=>`r${Math.floor(i/7)+1}c${i%7+1}`;
const vs=['A','B','C'];
const groups=Object.fromEntries(vs.map(v=>[v,data.records.filter(r=>r.variant===v)]));
const lows=Object.fromEntries(vs.map(v=>[v,groups[v].filter(r=>r.analysis)]));
const truth=r=>r.analysis.truths[r.analysis.plantedIndex];
const within=(t,k)=>t.edge.minimum!==null && t.edge.minimum<=k;
const sections=[];
sections.push(`# Solution-first generation: controlled local ambiguity

## Objective and scope

The target is **multiple local solutions and one eventual global solution**, not individually unique faces. This experiment models only a 7×7 face with seven orthogonally connected regions and exactly one unicorn per row, column, and region. There are no givens during generation, adjacency restrictions, symmetry reduction, or cube identifications. Hypothetical boundary facts test information capacity only. The useful [completed baseline](results-single-face.md) is preserved and was not rerun.

## Reproduction and sampling

Run from the repository root, with no dependencies:

\`\`\`sh
node experiments/solution-first/run.mjs
node --test experiments/single-face/model.test.mjs experiments/solution-first/model.test.mjs
node experiments/solution-first/report.mjs
\`\`\`

Each variant has **10,000 accepted boards**, 1,000 from each of ten independent initialized Mulberry32 streams. Decimal seeds: ${data.parameters.seeds.join(', ')}. Each variant restarts each seed. Comparisons share seed labels but are not paired boards: B consumes extra draws on rejected attempts, and C changes growth decisions. Sampling is with replacement without deduplication or rotation reduction. Rates describe these generators, not uniformly sampled connected partitions. No parameter tuning or second measurement run was performed.

Every attempt shuffles columns with Fisher–Yates to plant a seven-element permutation; region r starts at that permutation's cell in row r. Forty-two orthogonal additions assign every remaining cell. Growth cannot capture another planted cell because all seven seeds are occupied initially. Therefore the plant touches each row, column, and region exactly once, and every region remains connected.

- **A:** choose uniformly among directed occupied-to-empty frontier contacts.
- **B:** A followed by rejection if any final region is a singleton. Rejection resamples the permutation as well as growth. Limit: 100,000 attempts per accepted board, never reached.
- **C:** weight each frontier contact by **1 / current region size²**, then sample proportionally. This softly suppresses large regions and favors small ones; it imposes neither equal sizes nor hard size bounds. Trapped small regions remain possible.

The baseline's exhaustive permutation solver is reused unchanged. Each accepted board is validated and all 5,040 permutations are checked; every planted solution is verified present. Generation costs include rejected attempts, whose solution sets are not enumerated.

## Solution-count distribution

${table(['Solutions','A','B','C'],[[1,1,'1'],[2,3,'2–3'],[4,10,'4–10'],[11,50,'11–50'],[51,5040,'>50']].map(([lo,hi,label])=>[label,...vs.map(v=>{const c=groups[v].filter(r=>r.count>=lo&&r.count<=hi).length;return `${c} (${pct(c,10000)})`;})]))}

Zero-solution boards: **0** for every variant, as guaranteed by construction. Exact histograms are in [summary.json](solution-first/summary.json); [results.json](solution-first/results.json) contains every accepted board's count, sizes, seed, index, and attempt cost, plus full maps, complete solutions and analysis for every 2–10-solution board.

${table(['Variant','Mean solutions','Min / median / max','2–10 yield','Per-seed 2–10 yield range'],vs.map(v=>{const cs=groups[v].map(r=>r.count).sort((a,b)=>a-b);const yields=data.parameters.seeds.map(s=>lows[v].filter(r=>r.seed===s).length);return [v,mean(cs),`${cs[0]} / ${cs[4999]} / ${cs.at(-1)}`,pct(lows[v].length,10000),`${pct(Math.min(...yields),1000)}–${pct(Math.max(...yields),1000)}`];}))}

Per-seed outcomes (each denominator is 1,000 accepted boards):

${table(['Seed','A: 2–10','B: 2–10','C: 2–10'],data.parameters.seeds.map(s=>[s,...vs.map(v=>lows[v].filter(r=>r.seed===s).length)]))}

## Region sizes and cost

Pooled region-size counts (70,000 regions per variant):

${table(['Size','A','B','C'],[[1,1],[2,3],[4,6],[7,10],[11,15],[16,20],[21,49]].map(([lo,hi])=>[lo===hi?lo:`${lo}–${hi}`,...vs.map(v=>groups[v].flatMap(r=>r.sizes).filter(s=>s>=lo&&s<=hi).length)]))}

${table(['Variant','Size min / median / max','Boards with singleton','Attempts / accepted','Rejected attempts','Growth steps'],vs.map(v=>{const ss=groups[v].flatMap(r=>r.sizes).sort((a,b)=>a-b), attempts=sum(groups[v],r=>r.attempts);return[v,`${ss[0]} / ${ss[34999]} / ${ss.at(-1)}`,pct(groups[v].filter(r=>r.sizes.includes(1)).length,10000),(attempts/10000).toFixed(4),attempts-10000,attempts*42];}))}

Mean region size is exactly seven for all variants by the fixed total; the histogram, not that mean, measures balancing.

${table(['Variant','Generation ms','Solving ms','Low-ambiguity analysis ms','Raw attempts / 2–10 result','Compute ms / 2–10 result'],vs.map(v=>{const runs=data.runs.filter(r=>r.variant===v);return[v,...['generationMs','solveMs','analysisMs'].map(k=>sum(runs,r=>r[k]).toFixed(2)),(sum(runs,r=>r.attempts)/lows[v].length).toFixed(2),(sum(runs,r=>r.generationMs+r.solveMs+r.analysisMs)/lows[v].length).toFixed(2)];}))}

Measured once on ${data.environment.cpu}, ${data.environment.platform}/${data.environment.arch}, Node ${data.environment.node}. Timings exclude process startup, permutation setup, record assembly, JSON writes and report generation. They are observed throughput costs, not browser benchmarks or independent runtime replications. Filtering accepted boards for 2–10 solutions is a concrete controlled-generation strategy; the ratios above include the cost of discarded high-ambiguity boards. They do not guarantee a bounded number of attempts for a new seed.
`);
sections.push(`## What boundary resolvability means

Let S be a board's complete solution set and t a particular true solution. Cell i has state 1 when occupied and 0 otherwise. A revelation set R identifies t if the only s in S matching t on every cell of R is t. A decisive cell is a one-cell such set; both unicorn and non-unicorn revelations count. Only varying cells can be decisive when |S| > 1.

The boundary comprises **24 distinct cells**, including corners once. We compute the exact minimum number of boundary revelations for each t, not merely a search that stops at three. A dynamic program finds the smallest set covering all rival solutions, where a cell covers rivals with a different occupancy. A null minimum means even revealing the **entire boundary** cannot identify t because a rival has identical boundary occupancy.

The principal rates use the **planted truth**. We also report existential (at least one possible truth), universal (every possible truth, potentially with different clue sets), and uniformly weighted solution-level rates. The plant is not necessarily uniformly distributed among a board's solutions. These metrics assume optimally selected, truthful clues known simultaneously; they are not random clue rates, adaptive worst-case strategies, or proofs that simple deductions find the solution.

All tables below condition on **2–10 solutions**. C has only one such board and supports no frequency generalization.

${table(['Variant','Boards','Varying cells mean (min–max)','Varying boundary cells mean','One-cell decisive cells, plant mean','Boundary decisive cells, plant mean'],vs.map(v=>{const rs=lows[v],ds=rs.map(r=>r.analysis.differing.length);return[v,rs.length,`${mean(ds)} (${Math.min(...ds)}–${Math.max(...ds)})`,mean(rs.map(r=>r.analysis.boundaryDiffering.length)),mean(rs.map(r=>truth(r).all.decisive.length)),mean(rs.map(r=>truth(r).edge.decisive.length))];}))}

Minimum boundary clues for the planted truth (mutually exclusive counts):

${table(['Variant','1','2','3','4+','Impossible with entire boundary'],vs.map(v=>[v,...[1,2,3,'4+',null].map(k=>{const c=lows[v].filter(r=>k==='4+'?truth(r).edge.minimum>=4:truth(r).edge.minimum===k).length;return `${c} (${pct(c,lows[v].length)})`;})]))}

Cumulative resolvability rates:

${table(['Variant / ≤ clues','Planted truth','At least one truth','Every truth','All solution instances'],vs.flatMap(v=>[1,2,3].map(k=>{const rs=lows[v],ts=rs.flatMap(r=>r.analysis.truths);return[`${v} / ${k}`,pct(rs.filter(r=>within(truth(r),k)).length,rs.length),pct(rs.filter(r=>r.analysis.truths.some(t=>within(t,k))).length,rs.length),pct(rs.filter(r=>r.analysis.truths.every(t=>within(t,k))).length,rs.length),pct(ts.filter(t=>within(t,k)).length,ts.length)];})))}

${table(['Variant','Boards where no truth is boundary-identifiable','Boards with ≥1 one-cell decisive clue anywhere (plant)','Mean decisive cells over all solution instances'],vs.map(v=>[v,lows[v].filter(r=>r.analysis.truths.every(t=>t.edge.minimum===null)).length,lows[v].filter(r=>truth(r).all.decisive.length>0).length,mean(lows[v].flatMap(r=>r.analysis.truths.map(t=>t.all.decisive.length)))]))}

Filtering for boundary utility among **all 10,000 accepted boards**:

${table(['Variant','2–10 and planted ≤3 clues','2–10 and every truth ≤3 clues','Raw attempts / every-truth result'],vs.map(v=>{const robust=lows[v].filter(r=>r.analysis.truths.every(t=>within(t,3))).length;return[v,pct(lows[v].filter(r=>within(truth(r),3)).length,10000),`${robust} (${pct(robust,10000)})`,(sum(groups[v],r=>r.attempts)/robust).toFixed(2)];}))}

Per-seed counts of low-ambiguity boards whose planted truth resolves with ≤3 boundary clues (denominators are the low-ambiguity counts in the earlier seed table):

${table(['Seed','A','B','C'],data.parameters.seeds.map(seed=>[seed,...vs.map(v=>lows[v].filter(r=>r.seed===seed&&within(truth(r),3)).length)]))}

Cell lists and truth-specific decisive-cell counts/witnesses are retained for **every** low-ambiguity board. The difference set is the union of cells whose occupancy varies across solutions, not simply the difference from one selected rival. No actual shared-cell constraint is implemented.

## Small human deduction model and ambiguity shape

Start with every cell unknown. For each row, column, and region: an established unicorn eliminates every other candidate in that unit; a unit with one remaining candidate forces that cell. Repeat to a fixed point. Record each rule application with its unit/source. No guessing, backtracking, solution-intersection facts, pairs, Hall deductions, or cross-unit subset rules are used. Contradictory facts/units throw errors. Exhaustive counting and distinguishing-set search are separate measurement tools, never deduction steps.

We run this model without clues, then with a minimum boundary witness for the planted truth where one exists. The after-clue result is for the deterministic first minimum witness selected by the algorithm; other equally small witnesses might support different deduction progress.

${table(['Variant','Mean unicorns deduced without clues','Mean unknown cells','Boundary-identifiable plants','Solved by simple rules after minimum clues'],vs.map(v=>{const rs=lows[v],edge=rs.filter(r=>r.analysis.afterEdge!==null);return[v,mean(rs.map(r=>r.analysis.deduction.unicorns)),mean(rs.map(r=>r.analysis.deduction.unknown)),edge.length,`${edge.filter(r=>r.analysis.afterEdge.solved).length} / ${edge.length}`];}))}

For a deliberately conservative structural description, a **two-row swap** has exactly two solutions differing at four cells in two rows and two columns. Other **localized** sets touch at most three rows and three columns. All remaining sets are called **distributed**. This describes occupancy support, not visual connectedness or human difficulty.

${table(['Variant','Two-row swap','Other localized','Distributed'],vs.map(v=>[v,...['two-row swap','localized (at most 3 rows and columns)','distributed'].map(s=>lows[v].filter(r=>r.analysis.shape===s).length)]))}

Most low-ambiguity outcomes from A and B are distributed under this definition. Small solution count alone does not imply a simple swap, an understandable choice, or engaging deduction. Balancing here reduces small-ambiguity yield; this is an observation about the chosen inverse-square weighting, not every possible balancing scheme.
`);
for(const [key,e] of Object.entries(examples)) {
 const a=e.analysis,t=a.truths[a.plantedIndex],w=t.edge.witness;
 sections.push(`## Example: ${{twoSolutionEdge:'2-solution edge-resolvable',threeToFiveEdge:'3–5-solution edge-resolvable',multipleEdgeClues:'ambiguity requiring multiple edge clues',notEdgeResolvable:'low ambiguity not resolvable by any boundary facts'}[key]}

Variant ${e.variant}, seed ${e.seed}, accepted index ${e.index} (zero-based); ${e.count} solutions. Region sizes A–G: ${e.sizes.join(', ')}. Selection: first qualifying board in fixed variant/seed/index traversal. Examples illustrate categories, not typical boards. The multiple-clue category requires a planted minimum of two or three; the non-resolvable category requires impossibility for **every** truth.

\`\`\`text
${formatMap(e.map)}
\`\`\`

All solutions as **one-based columns in rows 1–7** (★ marks planted truth):

${e.solutions.map((p,i)=>`- ${i===a.plantedIndex?'★ ':''}\`${p.map(c=>c+1).join(', ')}\``).join('\n')}

Varying cells: ${a.differing.map(coord).join(', ')}. Varying boundary cells: ${a.boundaryDiffering.map(coord).join(', ')||'none'}. Shape: **${a.shape}** (${a.rows.length} rows, ${a.columns.length} columns).

${table(['Truth (list order)','Decisive cells anywhere','Decisive boundary cells','Minimum boundary clues'],a.truths.map((t,i)=>[i+1,t.all.decisive.length,t.edge.decisive.length,t.edge.minimum??'impossible']))}

Planted decisive cells anywhere: ${t.all.decisive.map(coord).join(', ')||'none'}. Planted decisive boundary cells: ${t.edge.decisive.map(coord).join(', ')||'none'}.

${w===null?'Even the full boundary leaves a rival for the planted truth.':`Minimum planted witness: ${w.map(cell=>`${coord(cell)} = ${e.planted[Math.floor(cell/7)]===cell%7?'unicorn':'empty'}`).join('; ')}.`}

Without clues: ${a.deduction.unicorns} unicorns deduced, ${a.deduction.unknown} unknown cells. ${a.afterEdge===null?'No identifying boundary witness exists.':`After that witness: ${a.afterEdge.unicorns} unicorns deduced, ${a.afterEdge.unknown} unknown cells; simple rules ${a.afterEdge.solved?'finish':'stall despite mathematical uniqueness'}.`} Complete traces are saved in [examples.json](solution-first/examples.json).
`);
}
sections.push(`## Design answers and limits

1. **Can controlled local ambiguity be generated reliably?** Yes as an offline generate-and-filter process, with measured A yield ${pct(lows.A.length,10000)} (199 examples across all ten seeds), not as an intrinsic guarantee of connected growth. A needs about ${(10000/lows.A.length).toFixed(1)} candidate boards per 2–10-solution result. None of the tested variants makes small ambiguity common, and human-meaningfulness remains unproven. The planted solution guarantees satisfiability only.
2. **Can boundary information frequently collapse that ambiguity?** It can for a measurable subset; the planted one-clue rate for A is ${pct(lows.A.filter(r=>within(truth(r),1)).length,lows.A.length)}, rising to ${pct(lows.A.filter(r=>within(truth(r),3)).length,lows.A.length)} with up to three optimally chosen clues. Entire-boundary collisions remain a real obstruction. Use the every-truth metric when selecting robust examples rather than relying solely on a favorable planted truth. These conditional rates must not be confused with yield among all generated boards.
3. **Which variant is best for UNICUBE?** **A is the best tested starting point for obtaining small local solution sets**, followed by explicit solution-count and boundary-resolvability filtering. B trades away much of the yield to remove singletons; C gives more balanced sizes but essentially no small-ambiguity sample. A is not yet a final game generator: its small regions and reliance on forced placements may be aesthetically undesirable. A less aggressive balancing weight or constructive ambiguity-preserving moves would be separate experiments, not claims supported here.
4. **Does the evidence justify moving on to cube topology?** **Yes, to a narrowly scoped mathematical feasibility experiment if separately authorized**, because satisfiable ambiguous faces and boundary-distinguishable examples now exist with reproducible witnesses. It does not justify gameplay implementation or assume global uniqueness. The next study must define cell identity, edge orientation, corners and region scope, and test whether consistent neighboring constraints actually provide compatible distinguishing information. Face-local plants can be mutually incompatible, and independently selectable boundary clues need not be available on a cube. No topology was added here.

## Verification and saved artifacts

Nine test groups pass: the five existing solver groups (including independent subset and region-first oracles), plus deterministic planted generation and B rejection, an independent exhaustive cell-subset oracle for revelation minima, soundness/contradiction checks for human deductions, and re-solving **all 236 saved low-ambiguity boards** with reproducible metrics and representative traces. Boundary tests include the 24-cell count, all four corners, an interior-only swap invisible to the entire boundary, and empty revelation sets. Cube shared-cell tests remain inapplicable because no cube model exists.

[summary.json](solution-first/summary.json) stores exact solution-count, pooled region-size and sorted-region-rank histograms per variant, plus per-seed summaries. [results.json](solution-first/results.json) stores all 30,000 accepted records and timings. [examples.json](solution-first/examples.json) stores four representative maps, every solution, differing cells, per-truth witnesses and complete deduction traces. The existing baseline artifacts and runtime placeholder are unchanged.
`);
const summary=Object.fromEntries(vs.map(v=>[v,{counts:hist(groups[v].map(r=>r.count)),sizes:hist(groups[v].flatMap(r=>r.sizes)),rankedSizes:Array.from({length:7},(_,rank)=>hist(groups[v].map(r=>r.sizes.toSorted((a,b)=>a-b)[rank]))),seeds:data.parameters.seeds.map(seed=>({seed,counts:hist(groups[v].filter(r=>r.seed===seed).map(r=>r.count)),low:lows[v].filter(r=>r.seed===seed).length}))}]));
writeFileSync(new URL('./summary.json',import.meta.url),JSON.stringify(summary,null,2)+'\n');
writeFileSync(new URL('../results-solution-first.md',import.meta.url),sections.join('\n'));
