import {readFileSync,writeFileSync} from 'node:fs';
import {regionNet} from './model.mjs';
import {formatNet} from '../complete-cube/model.mjs';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url)));
const data=read('./results.json'),examples=read('./examples.json');
const table=(h,rs)=>[h.join(' | '),h.map(()=>'---').join(' | '),...rs.map(r=>r.join(' | '))].join('\n');
const sum=(xs,f)=>xs.reduce((s,x)=>s+f(x),0);
const product=e=>Object.values(e.localCounts).reduce((p,n)=>p*BigInt(n),1n).toString();
const score=xs=>sum(xs,x=>x.matches);
let report=`# Step 5 — Constructed rainbow cube boards

## Outcome

**We can deliberately construct valid, globally unique rainbow cubes without any revealed unicorns or X marks, while all six faces remain locally ambiguous.** Three different unique region boards and one two-solution comparison board are saved. They reuse fixed Step 4 answers; they are not new complete-answer generation.

The initial assembly pass alone did not produce uniqueness. Targeted, legal region-boundary edits removed competing global answers: all **12** selected constructions reached exactly one solution after **1–4 edits**. The useful result is the saved verified boards and reproducible construction process, not a random-board uniqueness rate.

## Rule interpretation

There are exactly seven orthogonally connected regions **per face**, with labels **R O Y G B I V** (numeric IDs 0–6 in files). Every face cell belongs to exactly one region, and every region contains exactly one unicorn. Together with one unicorn per row and column, these rules apply on every face.

**Region identity is (face, label)**, not label alone. A shared canonical physical cell has one occupancy state but belongs to the local region of each incident face. It can display different labels from different face views. Equal colors across an edge do not combine constraints or create a global region. There are 42 face-local region constraints, even when colors visually agree. No adjacency restriction or pre-revealed cell states are included.

The saved Step 4 sources are [complete-cube/examples.json](complete-cube/examples.json): **high**, seed 12, and **moderate**, seed 0. Each is validated before construction; no answer is altered. Final saved A–D use seed 0; the refinement log also records successful constructions from seed 12.

## Constructive generation

1. For each source and face, seed the seven regions at its seven answer unicorns. Seed labels initially follow row order. All seven answer cells are occupied before growth, so another region can never absorb them.
2. Repeatedly assign an unassigned cell to an orthogonally touching region. Candidate (cell, region) weight is **same-region contact count² / sqrt(current region size)**. Multiple contacts favor compact additions; the size factor softly discourages dominance. Growth preserves connectivity and full coverage by construction.
3. Reject final maps with a region smaller than **2** or larger than **18** cells, or more than **14 leaf cells** across the face. A leaf has exactly one same-region orthogonal neighbor. All accepted boards therefore have no singleton regions. Leaf count is only a tendril proxy, not a proof of visual elegance; holes and long thin corridors are not explicitly prohibited.
4. Reuse the existing exhaustive 5,040-permutation single-face solver. Retain maps with **2–100 local solutions**, and with exactly one local completion matching the answer's entire boundary occupancy. The latter is a necessary filter for unique global puzzles: an interior-only alternative could never be removed by another face. This filter adds **no boundary clues** to the puzzle or global solver.
5. Collect 12 maps per face/source, assemble 100 seeded combinations per source, and exactly count each complete cube. From the 200 recorded assemblies, take the 12 with smallest global counts, stable ties in original traversal order.
6. Refine each selected assembly by moving one **non-answer** cell to an orthogonally neighboring region. Recheck connectivity, size/leaf limits and local solution count after each proposed move. Only consider moves affecting an occupied cell in a stored competing answer; such a transfer breaks that answer's one-per-region condition. Recount globally, choose the move giving the smallest strictly reduced count, and break count ties by smallest sum of isolated face counts. Continue for at most 12 edits. Because every moved cell is empty in the saved answer, its region counts remain unchanged. The answer is independently revalidated afterward.

This is a greedy construction procedure with bounded attempts, not a guarantee of success for arbitrary future answers. It edits the puzzle's regions; it never writes clues. Alternative solutions guide edits but are not supplied as facts to the final solver.

All seeds and edits are saved. Growth seeds are (imul(sourceSeed+1,2654435761) + faceIndex·100000 + attemptIndex) >>> 0, with faces front, back, left, right, top, bottom. Assembly selection uses Mulberry32 initialized to the Step 4 source seed. Growth uses its own freshly seeded Mulberry32. Maximum face attempts: 30,000; actual total: **${sum(data.poolStats,r=>r.attempts)}** for 144 retained maps. Shape rejects: ${sum(data.poolStats,r=>r.shapeRejected)}; logic-filter rejects: ${sum(data.poolStats,r=>r.logicRejected)}. Each complete puzzle count is exact or explicitly marked incomplete on a 2,000,000-node limit; no recorded construction count hit that limit.

${table(['Source','Face','Growth attempts','Shape rejects','Logic rejects','Retained'],data.poolStats.map(r=>[r.sourceName,r.face,r.attempts,r.shapeRejected,r.logicRejected,r.accepted]))}

## Global solver and independent verification

The primary counter is one global exact-cover search over the **218 canonical physical cells**. Each cell option covers the row, column and local-region equation for **every incident face**: 3 equations for an interior cell, 6 for an edge-interior cell and 9 for a corner. All **126 equations** (42 rows, 42 columns, 42 regions) must be covered exactly once. Face labels are part of region keys, preventing accidental merging of equal colors. No ground-truth occupancy, boundary facts, or face-solution lists constrain this search.

Depth-first search chooses the uncovered equation with fewest compatible physical-cell options. Every compatible option is explored. A count is reported as exact only after exhaustive traversal; reaching a solution limit or node limit returns an explicit incomplete result. Saved unique examples are counted with **no solution-count cutoff** and exhausted search. Up to 20 witness solutions are retained, independently of the exact count.

A second solver independently enumerates each face using the existing single-face solver and joins the six complete face domains, checking **both occupied and empty** shared references for equality. It agrees with the canonical exact-cover counter on the complete solution sets of A–D. This second approach is a verification oracle, not the primary construction model.

## Saved board counts and reduction by sharing

${table(['Board','front','back','left','right','top','bottom','Global','Independent face combinations'],['A','B','C','D'].map(k=>{const e=examples[k];return[k,...['front','back','left','right','top','bottom'].map(f=>e.localCounts[f]),e.globalCount,product(e)];}))}

The product column counts unconstrained combinations of isolated face answers; most disagree on shared cells. Exactly ${examples.A.globalCount}, ${examples.B.globalCount}, ${examples.C.globalCount}, and ${examples.D.globalCount} combinations respectively survive full canonical consistency. This is an exact before/after comparison, not a claim that all combinations were ever physically valid. All three unique examples have **six ambiguous faces**, so no isolated face can determine its own complete answer unaided.

- **A — several locally ambiguous faces:** first successful refinement, satisfying the stronger all-six condition. It is the direct one-cell refinement of D.
- **B — all locally ambiguous:** second successful refinement, a different region board on the same answer.
- **C — relatively easy-looking candidate:** lowest sum of local counts among the remaining successful refinements. This is a transparent construction heuristic, **not a human-difficulty rating**. It still has no singleton regions, so forced-remaining-cell deduction alone has no starting move. Human playtesting and stronger readable deductions are needed before calling it easy.
- **D — ambiguous comparison:** the assembled board with the smallest global count above one, before refinement. Both canonical solutions are saved; its alternative can be inspected separately in examples.json.

Refinement outcomes (no broad statistical inference intended):

${table(['Source','Assembly index','Before','After','Final local counts (front/back/left/right/top/bottom)','Cell transfers'],data.refinementTrials.map(r=>[r.sourceName,r.index,r.initialCount,r.finalCount,['front','back','left','right','top','bottom'].map(f=>r.localCounts[f]).join('/'),r.history.length]))}

## Presentation-only color continuity

After the region boundaries are fixed, relabel the seven colors independently on each face. Keep front fixed as an arbitrary color anchor. For each other face, enumerate all 7! label permutations and choose a strict improvement in matching labels along its four physical edges; sweep up to ten times. This coordinate-descent procedure preserves every region's cells, connectivity and logical solution set. It is a local improvement, not an optimality claim.

The metric is matching labels across **84 face-pair boundary positions** (12 edges × 7 cells). A corner contributes three pairwise comparisons, one for each incident physical edge. It is not 84 distinct physical cells. Full-edge agreement means all seven corresponding labels match.

${table(['Board','Matching positions before','After / 84','Fully matching edges / 12'],['A','B','C','D'].map(k=>{const c=examples[k].colorAlignment;return[k,score(c.before),score(c.after),c.after.filter(e=>e.matches===7).length];}))}

Partial same-color continuity is feasible without modifying logic. Perfect consistency is not achieved in these examples and must not be implied by the palette. A future display must retain face boundaries and explain “one per color region **on each face**”; a shared cell with mismatched labels needs a clear face-specific presentation. No visual assets or renderer were created here.

## Debug boards and separate answer overlays

The unfolding is the fixed 3A net: top above front; left–front–right–back across the middle; bottom below front. Rows increase down, columns right. Region nets contain only R O Y G B I V. Separate answer overlays use U and ., with shared unicorns repeated as face references. A player would receive only the region board; overlays are debug answers, not clues.
`;
for(const key of ['A','B','C','D']) {
 const e=examples[key];
 report+=`\n### Board ${key}\n\nSource ${e.sourceName}, answer seed ${e.sourceSeed}, assembly ${e.index}; global count **${e.globalCount}**.\n\n${table(['Face','Region sizes R O Y G B I V','Leaf cells'],Object.entries(e.regionShapes).map(([f,s])=>[f,s.sizes.join(', '),s.leaves]))}\n\nRegion board:\n\n\`\`\`text\n${regionNet(e.maps)}\`\`\`\n\nSeparate answer overlay:\n\n\`\`\`text\n${formatNet(e.truth)}\`\`\`\n`;
 if(e.refinement?.length)report+=`\nRegion edits before color relabeling (zero-based face cells, original numeric region IDs):\n\n${table(['Face','Row','Column','From region','To region','Global before → after'],e.refinement.map(h=>[h.face,Math.floor(h.cell/7),h.cell%7,h.from,h.to,`${h.before} → ${h.after}`]))}\n`;
}
report+=`\n## Design answers

1. **Can rainbow cubes be constructed reliably around complete answers?** Yes for the tested saved sources: seeded growth guarantees the answer survives, and bounded rejection produces the desired connected, non-singleton maps. Targeted boundary edits then produced twelve unique constructions. Arbitrary source/shape combinations are not guaranteed to succeed within the limits.
2. **Can the full cube be unique with no revealed unicorns?** **Yes. A, B and C each have exactly one global solution**, independently verified, with no revealed unicorns or X marks.
3. **Can unique cubes have ambiguous faces?** **Yes: all six faces are ambiguous on A, B and C.** Their isolated counts range from ${Math.min(...['A','B','C'].flatMap(k=>Object.values(examples[k].localCounts)))} to ${Math.max(...['A','B','C'].flatMap(k=>Object.values(examples[k].localCounts)))}.
4. **How much does sharing reduce ambiguity?** The table above gives exact local products and global survivors. For A, ${product(examples.A)} independent face combinations collapse to one; D retains two. Sharing resolves boundary alternatives, while the face-local regions eliminate the interior flexibility found in Step 4.
5. **Is same-color edge continuity feasible without complicating logic?** Partial continuity improves substantially by color permutation alone. It is optional presentation; it never merges logical regions. Complete color agreement is not established and mismatched shared-cell colors need careful presentation.
6. **Ready for a playable 2D prototype?** **Yes, the saved boards are logically verified fixtures for a separately authorized prototype and playtesting.** We have not established human solvability by a restricted rule set, difficulty, elegance or usability. C is only relatively easy-looking by its local-count heuristic. The prototype should test face-local color interpretation, shared-cell interaction and whether cross-face deductions are understandable. No rendering or gameplay was implemented.

## Reproduction, tests and artifacts

Run from the repository root with Node.js and no dependencies:

\`\`\`sh
node experiments/rainbow-cube/run.mjs
node --test experiments/rainbow-cube/model.test.mjs
node experiments/rainbow-cube/report.mjs
\`\`\`

The five rainbow test groups check all 144 retained maps and seeds; all four saved boards with two independent complete solvers; deterministic refinement and color relabeling with solution-set preservation; exhaustive n=2 physical subsets with face-local regions including unsatisfiable cases; malformed maps/answers and incomplete-count handling. Saved answers and all alternative witnesses obey the fixed shared topology. Existing topology and single-face tests are also run as regression checks.

- [examples.json](rainbow-cube/examples.json): four final boards, original maps, growth seeds, refinement histories, color permutations, answers, exact global counts and witnesses, local counts and shape metrics.
- [examples.txt](rainbow-cube/examples.txt): region nets and separate answer overlays.
- [pools.json](rainbow-cube/pools.json): all 144 retained face maps with seed and local counts.
- [results.json](rainbow-cube/results.json): exact face/global counts for every one of the 200 assembled cubes, all selected refinement outcomes, parameters and costs. Total construction time for this run: ${(data.elapsedMs/1000).toFixed(2)} seconds, excluding file writes; environment-dependent, not a benchmark.

The previous experiments remain complete and unchanged. Region constraints are strictly face-local; no global regions, clues, UI, rendering or gameplay were added.\n`;
writeFileSync(new URL('../results-rainbow-cube.md',import.meta.url),report);
console.log(table(['Board','Global','Product','Continuity before','After'],['A','B','C','D'].map(k=>[k,examples[k].globalCount,product(examples[k]),score(examples[k].colorAlignment.before),score(examples[k].colorAlignment.after)])));
