# Step 4 — Complete unicorn cube solutions

## Result and scope

**10,000 of 10,000 deterministic searches returned a valid complete placement.** Every sample satisfies all 84 face row/column equations, every face sees seven unicorns, and every sample has exactly 42 face–unicorn incidences. The distinct physical unicorn count ranges from **30 to 34**.

The fixed [Experiment 3A topology](results-cube-topology.md) is reused unchanged. One occupancy decision belongs to one canonical physical cell and affects all its face references simultaneously. There are no rainbow regions, colors, adjacency constraints, player clues, player puzzles, rendering, UI or gameplay in this step. Prior experiment measurements were not repeated.

## Global model and reproducibility

For each of the 218 canonical physical cells p, use a binary variable x_p. For each face row and each face column, require the sum of its seven cell variables to equal one. There are 6·(7+7)=**84 equations**. The seven-per-face equation is redundant but checked explicitly by the validator.

[model.mjs](complete-cube/model.mjs) constructs an exact-cover problem with **218 options**, one per physical cell. Selecting an interior, edge-interior or corner cell covers respectively **2, 4 or 6** incident row/column equations. Selecting any option excludes every other option sharing one of those equations. Search chooses an uncovered equation with the fewest currently compatible cells (MRV), chooses uniformly among tied equations, shuffles compatible cells with Fisher–Yates, and recursively searches in that order. It backtracks on contradictions. A fully covered set of equations is a complete answer; all unselected cells are empty.

This is a single global physical-cell search. Face permutations are derived afterward for inspection, never generated independently or reconciled. The complete search can enumerate until exhaustion, a requested answer limit, or a node limit, and distinguishes these statuses. The generation API requests the first answer with a 1,000,000-node limit and throws if no answer is found.

The validator uses a separate face-grid scan, not the solver's exact-cover incidence arrays. It rejects duplicate or unknown physical IDs, and checks each face's row counts, column counts and total. A list of canonical IDs is the complete placement representation; omitted cells are empty.

Run from the repository root with Node.js, no dependencies:

```sh
node experiments/complete-cube/run.mjs
node --test experiments/cube-topology/topology.test.mjs experiments/complete-cube/model.test.mjs
node experiments/complete-cube/report.mjs
```

Sample parameters: ten batches of 1,000, with **a freshly initialized Mulberry32 for each cube**, seed = (imul(batch,2654435761)+index) >>> 0, batch 0–9, index 0–999. All 10,000 seeds are distinct. There are no sharing targets, rejection by unicorn count, symmetry reduction or deduplication. There are 10000 distinct coordinate-fixed answers in the sample.

These are **first-answer randomized search frequencies**, not uniform frequencies over all valid cubes. MRV ordering and early stopping bias the distribution; batching reports reproducibility and variation, not independent estimates of a uniform solution-space measure. No global solution count is claimed.

## A structural fact stronger than the sampling results

Every physical cube edge is a complete boundary row or column on each of its two faces. Therefore **each of the twelve physical edges contains exactly one unicorn**, counting its corner endpoints. This follows from the existing rules; it is not an added sharing constraint. In particular, an all-interior 42-unicorn placement is impossible.

Let I, E and C count occupied face-interior cells, edge-interior cells and corners. Counting unicorn incidences on physical edges gives **E + 3C = 12**: a corner lies on three physical edges, while an edge-interior cell lies on one. Together with **I + 2E + 3C = 42**, this implies:

- E = 12 − 3C.
- I = 18 + 3C.
- Distinct physical unicorns I+E+C = **30+C**.
- Shared physical unicorns E+C = **12−2C**.

Two adjacent corners cannot both be occupied, because they share a complete edge. Four disjoint cube edges pair all eight corners, so at most four corners can be occupied. Thus C is in 0–4 and the total is necessarily in **30–34**. The sample contains every value, providing witnesses that all five totals are attainable. These are proven count bounds, not just observed extrema.

For a face with k occupied corners, there are 4−k distinct occupied boundary cells and 3+k occupied interior cells. Corners therefore reduce the number of distinct shared unicorns while increasing the number of interior unicorns. “High sharing” below means more distinct shared physical unicorns, not more corners.

## Observed distribution

Corners C | Edge interior E | Face interior I | Distinct | Shared E+C | Samples | Rate
--- | --- | --- | --- | --- | --- | ---
0 | 12 | 18 | 30 | 12 | 1781 | 17.81%
1 | 9 | 21 | 31 | 10 | 5074 | 50.74%
2 | 6 | 24 | 32 | 8 | 2844 | 28.44%
3 | 3 | 27 | 33 | 6 | 291 | 2.91%
4 | 0 | 30 | 34 | 4 | 10 | 0.10%

Measurement | Minimum | Mean | Maximum
--- | --- | --- | ---
distinct | 30 | 31.1675 | 34
interior | 18 | 21.5025 | 30
edge | 0 | 8.4975 | 12
corner | 0 | 1.1675 | 4
shared | 4 | 9.6650 | 12
incidences | 42 | 42.0000 | 42
coupledFacePairs | 12 | 12.0000 | 12

An edge-interior unicorn occurs in **99.90%** of samples. At least one corner occurs in **82.19%**. All samples contain shared unicorns, including the ten C=4 examples where all shared unicorns are corners and E=0. Every sample explicitly passes I+2E+3C=42 and every physical edge's occupancy check.

Batch corner histograms, 1,000 samples each:

Batch | C=0 | C=1 | C=2 | C=3 | C=4
--- | --- | --- | --- | --- | ---
0 | 169 | 513 | 284 | 31 | 3
1 | 174 | 493 | 297 | 36 | 0
2 | 176 | 480 | 308 | 36 | 0
3 | 184 | 509 | 281 | 25 | 1
4 | 185 | 509 | 279 | 25 | 2
5 | 161 | 523 | 291 | 22 | 3
6 | 179 | 515 | 281 | 25 | 0
7 | 186 | 491 | 295 | 28 | 0
8 | 182 | 523 | 268 | 27 | 0
9 | 185 | 518 | 260 | 36 | 1

## Cross-face coupling

Define a face-coupling graph: six face vertices, with an undirected link whenever those faces see the same occupied physical cell. An occupied corner contributes links between all three incident face pairs. **Every generated cube has all twelve adjacent face-pair links and one connected component of size six.** This is also a theorem: each of the twelve physical edges has its required unicorn, seen by the two incident faces.

Every face sees between 2 and 4 distinct shared unicorns in the sample. The graph measures shared occupied cells; shared empty cells also carry consistency information, which this metric does not count. Connectedness establishes structural coupling, not a claim about eventual human deduction difficulty.

## Search cost

Measured on Apple M4, darwin/arm64, Node v25.9.0. Search time: **735.05 ms**, validation/measurement: **620.64 ms**. Mean search time: **0.0735 ms/cube**. Timings exclude process startup, topology/model initialization, file writes and report generation; one measured run, no browser performance claim.

Search nodes, including root and completed-answer node: 31–35; mean 32.1675. Total dead ends: **0**. No sample hit the node limit or required a restart. The search has backtracking support, but this sample did not exercise failed branches; the exhaustive n=2 oracle test exercises full traversal. Fast first-answer search does not establish a uniform sampler or fast enumeration of the full solution space.

## Saved examples

Selection is deterministic: the first sample attaining minimum shared count, the first attaining the lower median shared count, and the first attaining maximum shared count. These are answer placements, not player puzzles. All canonical IDs, metrics and face permutations are saved in [examples.json](complete-cube/examples.json); standalone nets are in [examples.txt](complete-cube/examples.txt).

Nets use the fixed 3A unfolding: top above front, bottom below front, left–front–right–back across the middle. Rows increase downward and columns rightward. **U = unicorn; . = empty.** A shared unicorn appears twice or three times in this unfolded reference view, but occupies only one physical cell. Permutations below use zero-based columns for rows 0–6.

### few sharing — seed 318

Batch 0, index 318. Distinct 34; interior 30; edge interior 0; corners 4; shared 4; face incidences 42.

```text
                TOP
                U . . . . . .
                . . . U . . .
                . . . . U . .
                . U . . . . .
                . . U . . . .
                . . . . . U .
                . . . . . . U

LEFT            FRONT           RIGHT           BACK
U . . . . . .   . . . . . . U   U . . . . . .   . . . . . . U
. . . U . . .   . U . . . . .   . . . U . . .   . . . U . . .
. . . . . U .   . . . . . U .   . . . . . U .   . U . . . . .
. U . . . . .   . . . U . . .   . . U . . . .   . . U . . . .
. . . . U . .   . . . . U . .   . . . . U . .   . . . . . U .
. . U . . . .   . . U . . . .   . U . . . . .   . . . . U . .
. . . . . . U   U . . . . . .   . . . . . . U   U . . . . . .

                BOTTOM
                U . . . . . .
                . . . . U . .
                . . U . . . .
                . . . U . . .
                . U . . . . .
                . . . . . U .
                . . . . . . U
```

Face | Column permutation
--- | ---
front | 6, 1, 5, 3, 4, 2, 0
back | 6, 3, 1, 2, 5, 4, 0
left | 0, 3, 5, 1, 4, 2, 6
right | 0, 3, 5, 2, 4, 1, 6
top | 0, 3, 4, 1, 2, 5, 6
bottom | 0, 4, 2, 3, 1, 5, 6

### moderate sharing — seed 0

Batch 0, index 0. Distinct 31; interior 21; edge interior 9; corners 1; shared 10; face incidences 42.

```text
                TOP
                U . . . . . .
                . . . . . U .
                . . . . . . U
                . . U . . . .
                . . . U . . .
                . . . . U . .
                . U . . . . .

LEFT            FRONT           RIGHT           BACK
U . . . . . .   . U . . . . .   . . . . U . .   . . . . . . U
. . . . . . U   U . . . . . .   . U . . . . .   . . . U . . .
. . . . . U .   . . U . . . .   . . . U . . .   . U . . . . .
. U . . . . .   . . . . . U .   . . . . . . U   U . . . . . .
. . . U . . .   . . . . . . U   U . . . . . .   . . . . . U .
. . . . U . .   . . . . U . .   . . U . . . .   . . . . U . .
. . U . . . .   . . . U . . .   . . . . . U .   . . U . . . .

                BOTTOM
                . . . U . . .
                . U . . . . .
                . . U . . . .
                . . . . . U .
                U . . . . . .
                . . . . . . U
                . . . . U . .
```

Face | Column permutation
--- | ---
front | 1, 0, 2, 5, 6, 4, 3
back | 6, 3, 1, 0, 5, 4, 2
left | 0, 6, 5, 1, 3, 4, 2
right | 4, 1, 3, 6, 0, 2, 5
top | 0, 5, 6, 2, 3, 4, 1
bottom | 3, 1, 2, 5, 0, 6, 4

### high sharing — seed 12

Batch 0, index 12. Distinct 30; interior 18; edge interior 12; corners 0; shared 12; face incidences 42.

```text
                TOP
                . U . . . . .
                . . . . . . U
                . . . . U . .
                . . . . . U .
                U . . . . . .
                . . . U . . .
                . . U . . . .

LEFT            FRONT           RIGHT           BACK
. . . . U . .   . . U . . . .   . . . . . U .   . . . . . U .
. . . . . . U   U . . . . . .   . . . . U . .   . U . . . . .
. . . U . . .   . U . . . . .   . . . . . . U   U . . . . . .
. . . . . U .   . . . . U . .   . . U . . . .   . . U . . . .
. . U . . . .   . . . . . . U   U . . . . . .   . . . U . . .
U . . . . . .   . . . U . . .   . . . U . . .   . . . . . . U
. U . . . . .   . . . . . U .   . U . . . . .   . . . . U . .

                BOTTOM
                . . . . . U .
                . . . . . . U
                . . . . U . .
                . . . U . . .
                . U . . . . .
                U . . . . . .
                . . U . . . .
```

Face | Column permutation
--- | ---
front | 2, 0, 1, 4, 6, 3, 5
back | 5, 1, 0, 2, 3, 6, 4
left | 4, 6, 3, 5, 2, 0, 1
right | 5, 4, 6, 2, 0, 3, 1
top | 1, 6, 4, 5, 0, 3, 2
bottom | 5, 6, 4, 3, 1, 0, 2

## Design answers

1. **Can complete solutions be generated reliably?** Yes under these rules: 10,000/10,000 independently seeded first-answer searches succeeded and were validated. This is strong practical evidence, not a guarantee that every future search policy will be fast.
2. **What physical unicorn totals occur?** Exactly the attainable range **30–34**, determined by 30+C. All five totals appear in the sample.
3. **How common are edge unicorns?** Every physical edge always contains one unicorn including endpoints. Specifically edge-interior unicorns occur in 99.90% of generated cubes, with E in {0,3,6,9,12}.
4. **How common are corners?** 82.19% contain at least one. Counts 0–4 occur, with four corners rare under this search (0.10%).
5. **Is meaningful cross-face coupling naturally present?** Structurally yes, necessarily: every adjacent face pair shares an occupied cell. Whether this produces meaningful human reasoning needs later puzzle constraints and evaluation; it is not established by answer generation.
6. **Are there awkward structural features?** The outer rows/columns force the twelve-edge structure, so boundary occupancy is less flexible than an isolated face suggests. A corner simultaneously determines occupancy on three physical edges and forces their other cells empty. Unicorn totals cannot be fixed arbitrarily independently of corner count. Conversely, after a valid boundary assignment is fixed, each face still has 3+k unused interior rows and columns, giving (3+k)! independent interior matchings. There are at least (3!)^6 = **46,656** interior completions for any valid boundary assignment. Thus shared boundaries alone cannot determine a unique full answer; this is expected without additional constraints, and no such constraints have been added. High shared-cell count is not by itself a measure of difficulty or elegance.

## Verification and artifacts

**Eleven test groups pass:** the seven unchanged topology groups plus four complete-cube groups. The latter re-generate and validate all 10,000 stored placements, verify all face row/column totals and every shared reference, remeasure all invariants, compare exhaustive n=2 global search against an independent 256-subset geometric oracle, reject malformed/missing/extra/conflicting occupancy, test search limits, and validate/reproduce representative examples. The text net has 42 visible U references per answer. At n=2 the exhaustive oracle finds exactly two valid corner-only assignments.

[results.json](complete-cube/results.json) stores all seeds, canonical placements, per-sample counts, face permutations, shared cells per face, twelve edge occupancy counts, coupling components, search counters and batch timings. No runtime code or topology changes were made. No rainbow regions or player-puzzle generation was performed.
