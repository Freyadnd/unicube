# Solution-first generation: controlled local ambiguity

## Objective and scope

The target is **multiple local solutions and one eventual global solution**, not individually unique faces. This experiment models only a 7×7 face with seven orthogonally connected regions and exactly one unicorn per row, column, and region. There are no givens during generation, adjacency restrictions, symmetry reduction, or cube identifications. Hypothetical boundary facts test information capacity only. The useful [completed baseline](results-single-face.md) is preserved and was not rerun.

## Reproduction and sampling

Run from the repository root, with no dependencies:

```sh
node experiments/solution-first/run.mjs
node --test experiments/single-face/model.test.mjs experiments/solution-first/model.test.mjs
node experiments/solution-first/report.mjs
```

Each variant has **10,000 accepted boards**, 1,000 from each of ten independent initialized Mulberry32 streams. Decimal seeds: 1, 42, 137, 2026, 65537, 8675309, 20260912, 314159265, 2718281828, 4294967295. Each variant restarts each seed. Comparisons share seed labels but are not paired boards: B consumes extra draws on rejected attempts, and C changes growth decisions. Sampling is with replacement without deduplication or rotation reduction. Rates describe these generators, not uniformly sampled connected partitions. No parameter tuning or second measurement run was performed.

Every attempt shuffles columns with Fisher–Yates to plant a seven-element permutation; region r starts at that permutation's cell in row r. Forty-two orthogonal additions assign every remaining cell. Growth cannot capture another planted cell because all seven seeds are occupied initially. Therefore the plant touches each row, column, and region exactly once, and every region remains connected.

- **A:** choose uniformly among directed occupied-to-empty frontier contacts.
- **B:** A followed by rejection if any final region is a singleton. Rejection resamples the permutation as well as growth. Limit: 100,000 attempts per accepted board, never reached.
- **C:** weight each frontier contact by **1 / current region size²**, then sample proportionally. This softly suppresses large regions and favors small ones; it imposes neither equal sizes nor hard size bounds. Trapped small regions remain possible.

The baseline's exhaustive permutation solver is reused unchanged. Each accepted board is validated and all 5,040 permutations are checked; every planted solution is verified present. Generation costs include rejected attempts, whose solution sets are not enumerated.

## Solution-count distribution

Solutions | A | B | C
--- | --- | --- | ---
1 | 0 (0.00%) | 0 (0.00%) | 0 (0.00%)
2–3 | 9 (0.09%) | 1 (0.01%) | 0 (0.00%)
4–10 | 190 (1.90%) | 35 (0.35%) | 1 (0.01%)
11–50 | 2444 (24.44%) | 1148 (11.48%) | 58 (0.58%)
>50 | 7357 (73.57%) | 8816 (88.16%) | 9941 (99.41%)

Zero-solution boards: **0** for every variant, as guaranteed by construction. Exact histograms are in [summary.json](solution-first/summary.json); [results.json](solution-first/results.json) contains every accepted board's count, sizes, seed, index, and attempt cost, plus full maps, complete solutions and analysis for every 2–10-solution board.

Variant | Mean solutions | Min / median / max | 2–10 yield | Per-seed 2–10 yield range
--- | --- | --- | --- | ---
A | 125.40 | 2 / 96 / 700 | 1.99% | 1.30%–2.70%
B | 155.70 | 3 / 133 / 700 | 0.36% | 0.10%–0.90%
C | 321.64 | 4 / 318 / 912 | 0.01% | 0.00%–0.10%

Per-seed outcomes (each denominator is 1,000 accepted boards):

Seed | A: 2–10 | B: 2–10 | C: 2–10
--- | --- | --- | ---
1 | 26 | 3 | 0
42 | 19 | 3 | 0
137 | 13 | 3 | 0
2026 | 19 | 1 | 0
65537 | 18 | 3 | 0
8675309 | 21 | 9 | 0
20260912 | 27 | 3 | 0
314159265 | 16 | 1 | 1
2718281828 | 20 | 4 | 0
4294967295 | 20 | 6 | 0

## Region sizes and cost

Pooled region-size counts (70,000 regions per variant):

Size | A | B | C
--- | --- | --- | ---
1 | 3191 | 0 | 84
2–3 | 11343 | 12615 | 2155
4–6 | 20957 | 22931 | 26029
7–10 | 21466 | 22570 | 38885
11–15 | 10740 | 10164 | 2841
16–20 | 2027 | 1556 | 6
21–49 | 276 | 164 | 0

Variant | Size min / median / max | Boards with singleton | Attempts / accepted | Rejected attempts | Growth steps
--- | --- | --- | --- | --- | ---
A | 1 / 6 / 31 | 28.41% | 1.0000 | 0 | 420000
B | 2 / 6 / 29 | 0.00% | 1.3968 | 3968 | 586656
C | 1 / 7 / 17 | 0.84% | 1.0000 | 0 | 420000

Mean region size is exactly seven for all variants by the fixed total; the histogram, not that mean, measures balancing.

Variant | Generation ms | Solving ms | Low-ambiguity analysis ms | Raw attempts / 2–10 result | Compute ms / 2–10 result
--- | --- | --- | --- | --- | ---
A | 369.39 | 3753.25 | 49.88 | 50.25 | 20.97
B | 493.37 | 3772.29 | 9.70 | 388.00 | 118.76
C | 403.36 | 4156.71 | 0.19 | 10000.00 | 4560.26

Measured once on Apple M4, darwin/arm64, Node v25.9.0. Timings exclude process startup, permutation setup, record assembly, JSON writes and report generation. They are observed throughput costs, not browser benchmarks or independent runtime replications. Filtering accepted boards for 2–10 solutions is a concrete controlled-generation strategy; the ratios above include the cost of discarded high-ambiguity boards. They do not guarantee a bounded number of attempts for a new seed.

## What boundary resolvability means

Let S be a board's complete solution set and t a particular true solution. Cell i has state 1 when occupied and 0 otherwise. A revelation set R identifies t if the only s in S matching t on every cell of R is t. A decisive cell is a one-cell such set; both unicorn and non-unicorn revelations count. Only varying cells can be decisive when |S| > 1.

The boundary comprises **24 distinct cells**, including corners once. We compute the exact minimum number of boundary revelations for each t, not merely a search that stops at three. A dynamic program finds the smallest set covering all rival solutions, where a cell covers rivals with a different occupancy. A null minimum means even revealing the **entire boundary** cannot identify t because a rival has identical boundary occupancy.

The principal rates use the **planted truth**. We also report existential (at least one possible truth), universal (every possible truth, potentially with different clue sets), and uniformly weighted solution-level rates. The plant is not necessarily uniformly distributed among a board's solutions. These metrics assume optimally selected, truthful clues known simultaneously; they are not random clue rates, adaptive worst-case strategies, or proofs that simple deductions find the solution.

All tables below condition on **2–10 solutions**. C has only one such board and supports no frequency generalization.

Variant | Boards | Varying cells mean (min–max) | Varying boundary cells mean | One-cell decisive cells, plant mean | Boundary decisive cells, plant mean
--- | --- | --- | --- | --- | ---
A | 199 | 12.29 (4–19) | 5.09 | 0.47 | 0.19
B | 36 | 12.86 (7–23) | 6.72 | 0.31 | 0.14
C | 1 | 8.00 (8–8) | 6.00 | 1.00 | 1.00

Minimum boundary clues for the planted truth (mutually exclusive counts):

Variant | 1 | 2 | 3 | 4+ | Impossible with entire boundary
--- | --- | --- | --- | --- | ---
A | 26 (13.07%) | 38 (19.10%) | 6 (3.02%) | 0 (0.00%) | 129 (64.82%)
B | 2 (5.56%) | 14 (38.89%) | 3 (8.33%) | 0 (0.00%) | 17 (47.22%)
C | 1 (100.00%) | 0 (0.00%) | 0 (0.00%) | 0 (0.00%) | 0 (0.00%)

Cumulative resolvability rates:

Variant / ≤ clues | Planted truth | At least one truth | Every truth | All solution instances
--- | --- | --- | --- | ---
A / 1 | 13.07% | 42.71% | 3.52% | 11.58%
A / 2 | 32.16% | 63.82% | 16.08% | 37.38%
A / 3 | 35.18% | 65.33% | 21.61% | 40.85%
B / 1 | 5.56% | 36.11% | 2.78% | 10.55%
B / 2 | 44.44% | 72.22% | 22.22% | 48.36%
B / 3 | 52.78% | 80.56% | 36.11% | 60.00%
C / 1 | 100.00% | 100.00% | 0.00% | 75.00%
C / 2 | 100.00% | 100.00% | 100.00% | 100.00%
C / 3 | 100.00% | 100.00% | 100.00% | 100.00%

Variant | Boards where no truth is boundary-identifiable | Boards with ≥1 one-cell decisive clue anywhere (plant) | Mean decisive cells over all solution instances
--- | --- | --- | ---
A | 69 | 69 | 0.38
B | 7 | 7 | 0.24
C | 0 | 1 | 1.00

Filtering for boundary utility among **all 10,000 accepted boards**:

Variant | 2–10 and planted ≤3 clues | 2–10 and every truth ≤3 clues | Raw attempts / every-truth result
--- | --- | --- | ---
A | 0.70% | 43 (0.43%) | 232.56
B | 0.19% | 13 (0.13%) | 1074.46
C | 0.01% | 1 (0.01%) | 10000.00

Per-seed counts of low-ambiguity boards whose planted truth resolves with ≤3 boundary clues (denominators are the low-ambiguity counts in the earlier seed table):

Seed | A | B | C
--- | --- | --- | ---
1 | 8 | 1 | 0
42 | 5 | 1 | 0
137 | 5 | 3 | 0
2026 | 6 | 1 | 0
65537 | 8 | 3 | 0
8675309 | 6 | 5 | 0
20260912 | 13 | 0 | 0
314159265 | 7 | 0 | 1
2718281828 | 3 | 2 | 0
4294967295 | 9 | 3 | 0

Cell lists and truth-specific decisive-cell counts/witnesses are retained for **every** low-ambiguity board. The difference set is the union of cells whose occupancy varies across solutions, not simply the difference from one selected rival. No actual shared-cell constraint is implemented.

## Small human deduction model and ambiguity shape

Start with every cell unknown. For each row, column, and region: an established unicorn eliminates every other candidate in that unit; a unit with one remaining candidate forces that cell. Repeat to a fixed point. Record each rule application with its unit/source. No guessing, backtracking, solution-intersection facts, pairs, Hall deductions, or cross-unit subset rules are used. Contradictory facts/units throw errors. Exhaustive counting and distinguishing-set search are separate measurement tools, never deduction steps.

We run this model without clues, then with a minimum boundary witness for the planted truth where one exists. The after-clue result is for the deterministic first minimum witness selected by the algorithm; other equally small witnesses might support different deduction progress.

Variant | Mean unicorns deduced without clues | Mean unknown cells | Boundary-identifiable plants | Solved by simple rules after minimum clues
--- | --- | --- | --- | ---
A | 2.07 | 25.59 | 70 | 62 / 70
B | 0.00 | 49.00 | 19 | 14 / 19
C | 0.00 | 49.00 | 1 | 1 / 1

For a deliberately conservative structural description, a **two-row swap** has exactly two solutions differing at four cells in two rows and two columns. Other **localized** sets touch at most three rows and three columns. All remaining sets are called **distributed**. This describes occupancy support, not visual connectedness or human difficulty.

Variant | Two-row swap | Other localized | Distributed
--- | --- | --- | ---
A | 5 | 19 | 175
B | 0 | 1 | 35
C | 0 | 1 | 0

Most low-ambiguity outcomes from A and B are distributed under this definition. Small solution count alone does not imply a simple swap, an understandable choice, or engaging deduction. Balancing here reduces small-ambiguity yield; this is an observation about the chosen inverse-square weighting, not every possible balancing scheme.

## Example: ambiguity requiring multiple edge clues

Variant A, seed 1, accepted index 17 (zero-based); 6 solutions. Region sizes A–G: 3, 3, 7, 5, 23, 7, 1. Selection: first qualifying board in fixed variant/seed/index traversal. Examples illustrate categories, not typical boards. The multiple-clue category requires a planted minimum of two or three; the non-resolvable category requires impossibility for **every** truth.

```text
C C B A A D D
C C B B A D F
C C E E E D F
E C E E E D F
E E E E E E F
E E E E E E F
E E E E G F F
```

All solutions as **one-based columns in rows 1–7** (★ marks planted truth):

- ★ `4, 3, 1, 6, 2, 7, 5`
- `4, 3, 1, 6, 7, 2, 5`
- `4, 3, 2, 6, 1, 7, 5`
- `4, 3, 2, 6, 7, 1, 5`
- `4, 3, 6, 2, 1, 7, 5`
- `4, 3, 6, 2, 7, 1, 5`

Varying cells: r3c1, r3c2, r3c6, r4c2, r4c6, r5c1, r5c2, r5c7, r6c1, r6c2, r6c7. Varying boundary cells: r3c1, r5c1, r5c7, r6c1, r6c7. Shape: **distributed** (4 rows, 4 columns).

Truth (list order) | Decisive cells anywhere | Decisive boundary cells | Minimum boundary clues
--- | --- | --- | ---
1 | 1 | 0 | 2
2 | 1 | 0 | 2
3 | 0 | 0 | impossible
4 | 0 | 0 | impossible
5 | 0 | 0 | impossible
6 | 0 | 0 | impossible

Planted decisive cells anywhere: r5c2. Planted decisive boundary cells: none.

Minimum planted witness: r5c1 = empty; r5c7 = empty.

Without clues: 3 unicorns deduced, 16 unknown cells. After that witness: 3 unicorns deduced, 14 unknown cells; simple rules stall despite mathematical uniqueness. Complete traces are saved in [examples.json](solution-first/examples.json).

## Example: low ambiguity not resolvable by any boundary facts

Variant A, seed 1, accepted index 36 (zero-based); 4 solutions. Region sizes A–G: 2, 14, 3, 2, 20, 5, 3. Selection: first qualifying board in fixed variant/seed/index traversal. Examples illustrate categories, not typical boards. The multiple-clue category requires a planted minimum of two or three; the non-resolvable category requires impossibility for **every** truth.

```text
B A A B B B C
B B B B B B C
D B B E E E C
D B B E E E E
F E E E E E E
F F F E E E E
F G G G E E E
```

All solutions as **one-based columns in rows 1–7** (★ marks planted truth):

- ★ `2, 5, 7, 1, 6, 3, 4`
- `2, 6, 7, 1, 5, 3, 4`
- `3, 5, 7, 1, 6, 2, 4`
- `3, 6, 7, 1, 5, 2, 4`

Varying cells: r1c2, r1c3, r2c5, r2c6, r5c5, r5c6, r6c2, r6c3. Varying boundary cells: r1c2, r1c3. Shape: **distributed** (4 rows, 4 columns).

Truth (list order) | Decisive cells anywhere | Decisive boundary cells | Minimum boundary clues
--- | --- | --- | ---
1 | 0 | 0 | impossible
2 | 0 | 0 | impossible
3 | 0 | 0 | impossible
4 | 0 | 0 | impossible

Planted decisive cells anywhere: none. Planted decisive boundary cells: none.

Even the full boundary leaves a rival for the planted truth.

Without clues: 0 unicorns deduced, 49 unknown cells. No identifying boundary witness exists. Complete traces are saved in [examples.json](solution-first/examples.json).

## Example: 2-solution edge-resolvable

Variant A, seed 1, accepted index 524 (zero-based); 2 solutions. Region sizes A–G: 11, 10, 6, 8, 9, 4, 1. Selection: first qualifying board in fixed variant/seed/index traversal. Examples illustrate categories, not typical boards. The multiple-clue category requires a planted minimum of two or three; the non-resolvable category requires impossibility for **every** truth.

```text
A A A A A A A
A A A A B B B
E C C C B B B
E E C C B B D
E E E C B B D
F F E E D D D
G F F E D D D
```

All solutions as **one-based columns in rows 1–7** (★ marks planted truth):

- `5, 6, 4, 7, 3, 2, 1`
- ★ `6, 5, 4, 7, 3, 2, 1`

Varying cells: r1c5, r1c6, r2c5, r2c6. Varying boundary cells: r1c5, r1c6. Shape: **two-row swap** (2 rows, 2 columns).

Truth (list order) | Decisive cells anywhere | Decisive boundary cells | Minimum boundary clues
--- | --- | --- | ---
1 | 4 | 2 | 1
2 | 4 | 2 | 1

Planted decisive cells anywhere: r1c5, r1c6, r2c5, r2c6. Planted decisive boundary cells: r1c5, r1c6.

Minimum planted witness: r1c5 = empty.

Without clues: 5 unicorns deduced, 4 unknown cells. After that witness: 7 unicorns deduced, 0 unknown cells; simple rules finish. Complete traces are saved in [examples.json](solution-first/examples.json).

## Example: 3–5-solution edge-resolvable

Variant A, seed 137, accepted index 644 (zero-based); 3 solutions. Region sizes A–G: 3, 4, 1, 14, 20, 3, 4. Selection: first qualifying board in fixed variant/seed/index traversal. Examples illustrate categories, not typical boards. The multiple-clue category requires a planted minimum of two or three; the non-resolvable category requires impossibility for **every** truth.

```text
A A D D D D D
A B B D D D D
B B C D D D D
E E E D E E E
E E E E E E F
E E E E G F F
E E E E G G G
```

All solutions as **one-based columns in rows 1–7** (★ marks planted truth):

- `1, 2, 3, 4, 5, 6, 7`
- ★ `1, 2, 3, 4, 5, 7, 6`
- `1, 2, 3, 4, 6, 7, 5`

Varying cells: r5c5, r5c6, r6c6, r6c7, r7c5, r7c6, r7c7. Varying boundary cells: r6c7, r7c5, r7c6, r7c7. Shape: **localized (at most 3 rows and columns)** (3 rows, 3 columns).

Truth (list order) | Decisive cells anywhere | Decisive boundary cells | Minimum boundary clues
--- | --- | --- | ---
1 | 3 | 2 | 1
2 | 1 | 1 | 1
3 | 3 | 1 | 1

Planted decisive cells anywhere: r7c6. Planted decisive boundary cells: r7c6.

Minimum planted witness: r7c6 = unicorn.

Without clues: 4 unicorns deduced, 9 unknown cells. After that witness: 7 unicorns deduced, 0 unknown cells; simple rules finish. Complete traces are saved in [examples.json](solution-first/examples.json).

## Design answers and limits

1. **Can controlled local ambiguity be generated reliably?** Yes as an offline generate-and-filter process, with measured A yield 1.99% (199 examples across all ten seeds), not as an intrinsic guarantee of connected growth. A needs about 50.3 candidate boards per 2–10-solution result. None of the tested variants makes small ambiguity common, and human-meaningfulness remains unproven. The planted solution guarantees satisfiability only.
2. **Can boundary information frequently collapse that ambiguity?** It can for a measurable subset; the planted one-clue rate for A is 13.07%, rising to 35.18% with up to three optimally chosen clues. Entire-boundary collisions remain a real obstruction. Use the every-truth metric when selecting robust examples rather than relying solely on a favorable planted truth. These conditional rates must not be confused with yield among all generated boards.
3. **Which variant is best for UNICUBE?** **A is the best tested starting point for obtaining small local solution sets**, followed by explicit solution-count and boundary-resolvability filtering. B trades away much of the yield to remove singletons; C gives more balanced sizes but essentially no small-ambiguity sample. A is not yet a final game generator: its small regions and reliance on forced placements may be aesthetically undesirable. A less aggressive balancing weight or constructive ambiguity-preserving moves would be separate experiments, not claims supported here.
4. **Does the evidence justify moving on to cube topology?** **Yes, to a narrowly scoped mathematical feasibility experiment if separately authorized**, because satisfiable ambiguous faces and boundary-distinguishable examples now exist with reproducible witnesses. It does not justify gameplay implementation or assume global uniqueness. The next study must define cell identity, edge orientation, corners and region scope, and test whether consistent neighboring constraints actually provide compatible distinguishing information. Face-local plants can be mutually incompatible, and independently selectable boundary clues need not be available on a cube. No topology was added here.

## Verification and saved artifacts

Nine test groups pass: the five existing solver groups (including independent subset and region-first oracles), plus deterministic planted generation and B rejection, an independent exhaustive cell-subset oracle for revelation minima, soundness/contradiction checks for human deductions, and re-solving **all 236 saved low-ambiguity boards** with reproducible metrics and representative traces. Boundary tests include the 24-cell count, all four corners, an interior-only swap invisible to the entire boundary, and empty revelation sets. Cube shared-cell tests remain inapplicable because no cube model exists.

[summary.json](solution-first/summary.json) stores exact solution-count, pooled region-size and sorted-region-rank histograms per variant, plus per-seed summaries. [results.json](solution-first/results.json) stores all 30,000 accepted records and timings. [examples.json](solution-first/examples.json) stores four representative maps, every solution, differing cells, per-truth witnesses and complete deduction traces. The existing baseline artifacts and runtime placeholder are unchanged.
