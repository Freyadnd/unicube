# Single-face baseline experiment

## Scope and reproduction

Only a 7×7 face is modeled. Each cell has one region ID 0–6 (displayed A–G); all seven regions are nonempty and orthogonally connected. A placement has exactly one unicorn per row, column, and region. No adjacency rule, givens, cube topology, rendering, or gameplay is included. Uniqueness means one assignment in fixed coordinates, without symmetry reduction.

Run from the repository root with Node.js (no dependencies):

```sh
node --test experiments/single-face/model.test.mjs
node experiments/single-face/run.mjs
node experiments/single-face/report.mjs
```

Parameters: **10,000 maps**, one continuous **Mulberry32** PRNG stream with decimal seed **20260912**, seven uniformly selected distinct seed cells per map. At each of 42 growth steps, choose uniformly among directed occupied-to-empty orthogonal grid edges and give the empty endpoint the occupied endpoint's region. Maps are sampled with replacement; no deduplication, rejection for solution count, size balancing, or planted solution. Region sizes may differ. Connectivity is preserved because each addition touches its own region.

This distribution is **not uniform over connected partitions**: multiple frontier contacts increase a cell/region's chance of growing, and larger frontiers have more opportunities. All percentages below are empirical rates for this generator and seed, not estimates over all possible puzzle boards. A single seed run does not assess between-run variability.

Solver: precompute all 7! = 5,040 column permutations, then retain precisely those touching seven distinct region IDs. One-per-row is implicit in the representation; permutation columns enforce one-per-column. Seven distinct selected regions out of seven gives exactly one per region. Thus the enumeration is exhaustive. Map validation checks coverage, IDs, nonemptiness, and connectivity. The uniqueness API checks whether the full solution list has length one.

## Aggregate results

Outcome | Maps | Fraction
--- | --- | ---
zero | 5272 | 52.72%
unique | 12 | 0.12%
multiple | 4716 | 47.16%

Mean solution count: **32.2901**; median: **0**; quartiles: **0, 36**; 90th/95th/99th percentiles: **104, 164, 300**; range: **0–576**. Quantiles use sorted index floor(p × (N−1)). Among the 4,728 satisfiable maps, 12 (0.254%) are unique.

Solution count | Maps
--- | ---
0 | 5272
1 | 12
2–10 | 753
11–50 | 1964
51–100 | 953
101–250 | 861
251–500 | 176
501–5040 | 9

Full exact solution-count histogram, per-map counts and sizes, pooled size histogram, and size histograms by sorted rank are saved in [results.json](single-face/results.json).

## Region sizes

There are 70,000 sampled regions. Their mean size is exactly 7 by construction of the partition total, **not** because sizes are balanced. Median 6; quartiles 3 and 10; range 1–35.

Region size (cells) | Regions
--- | ---
1 | 5832
2–3 | 14015
4–6 | 18396
7–10 | 16822
11–15 | 10257
16–20 | 3538
21–35 | 1140

Singleton region present? | Maps | Zero solutions | Unique
--- | --- | --- | ---
with | 4656 | 3155 (67.76%) | 7
without | 5344 | 2117 (39.61%) | 5

Singletons force placements and can conflict in a row or column. Their association with failure here is descriptive, not proof that they cause every failure. Five unique maps had no singleton region; uniqueness does not require a singleton in this sample.

## Runtime and verification

Measured on Apple M4, darwin/arm64, Node v25.9.0. One process, one measured run; no benchmark repetitions. Permutation setup 2.17 ms; map generation 273.68 ms; exhaustive solving including map validation 3559.60 ms; total computation including statistics and saved-example validation 3846.95 ms. Total excludes JSON file writes and process startup; timings vary by machine and run. Average solve time 0.3560 ms/map.

Five test groups pass, including full reproduction and placement validation of all saved representative solutions. Independent brute force chooses arbitrary n-cell subsets of n² cells and checks explicit row/column/region counts: every connected labeled 2×2 partition, 100 generated 3×3 maps and 30 generated 4×4 maps. A second independent region-first cell search matches complete solution sets for 20 generated 7×7 maps. Other checks cover 5,040 stripe solutions, a connected unsatisfiable map, a known unique 2×2 case, invalid placements/maps, and reproducibility/connectivity of 1,000 generated maps. Exhaustively choosing seven arbitrary cells from 49 is unnecessary for every 7×7 map; the region-first oracle provides an independent full-size check.

## Representative boards

Selection was predetermined by code: first unique board; first board achieving the smallest positive count above one; first board achieving the maximum count. These illustrate outcomes, not typical difficulty. A–G represent seven distinct face-local colors. [examples.json](single-face/examples.json) stores these maps and **all** their solutions in zero-based coordinates.

### Unique solution: 1 solution(s)

Sample index 886 (zero-based). Region sizes A–G: 11, 1, 6, 6, 3, 14, 8.

```text
C C G G G B E
C C G G G G E
C F D G D A E
C F D D D A A
F F F D A A A
F F F F A A A
F F F F F A A
```

All solutions as **one-based columns for rows 1–7**: `6, 3, 7, 1, 4, 5, 2`.

### Low ambiguity: 2 solution(s)

Sample index 112 (zero-based). Region sizes A–G: 9, 13, 6, 1, 5, 2, 13.

```text
B B B B D E E
B B B B B E E
B B B A B A E
G G A A A A F
G G G G A A F
G G G G A C C
G G G C C C C
```

All solutions as **one-based columns for rows 1–7**: `5, 6, 1, 3, 7, 2, 4`; `5, 6, 2, 3, 7, 1, 4`.

### High ambiguity: 576 solution(s)

Sample index 9427 (zero-based). Region sizes A–G: 9, 5, 7, 9, 7, 6, 6.

```text
D B B B F F F
D D B B F F F
D D D A A A A
D D D A A A A
G G G G G C A
E E E G C C C
E E E E C C C
```

One example solution as **one-based columns for rows 1–7**: `2, 5, 1, 6, 3, 7, 4`.

## Mathematical observations and limitations

- The seven-unicorn total is redundant once the seven row constraints hold. Column constraints reduce the search to permutations; region constraints select a subset of them.
- Connectivity alone guarantees neither existence nor uniqueness. Two singleton regions in one row already make a connected partition impossible to solve. The test fixture has six singleton regions on the first row and one connected remainder.
- Regions can be redundant: seven horizontal stripes (or vertical stripes) satisfy the region condition for every permutation, giving the theoretical maximum of 5,040 solutions. The sampled maximum of 576 is not an upper bound on this rule set.
- Region shape matters beyond size. For any subset of regions, their combined cells must touch at least as many rows and at least as many columns as there are regions (necessary Hall-type conditions). These separate row/column conditions do not by themselves establish a simultaneous placement; full enumeration remains the authority here.
- Uniqueness is possible, but very rare under this generator. The chosen unique example includes a forced singleton; the low-ambiguity example has two solutions differing only by swapping two columns between rows. Such small interchangeable choices may be structurally trivial rather than interesting deductions.
- Solution count measures ambiguity, not human difficulty, elegance, or fun. No human deduction model or playtesting was performed. These results do not establish that the proposed rules make a good puzzle.

## Recommended next experiment

Stay on a single face. Compare this baseline with (a) connected growth rejecting singleton regions and (b) solution-first connected growth seeded at the seven cells of a random permutation. The second construction guarantees at least the planted solution, without guaranteeing uniqueness. Run matched multi-seed samples, report rejection/acceptance costs and region-size distributions, and stratify counts by size and forced cells. Add a small explicit deduction model (forced cells and row/column/region elimination) to distinguish trivial uniqueness from puzzles requiring branching. Do not add cube topology until these controls clarify whether useful local ambiguity can be generated deliberately.
