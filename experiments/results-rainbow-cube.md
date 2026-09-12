# Step 5 — Constructed rainbow cube boards

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

All seeds and edits are saved. Growth seeds are (imul(sourceSeed+1,2654435761) + faceIndex·100000 + attemptIndex) >>> 0, with faces front, back, left, right, top, bottom. Assembly selection uses Mulberry32 initialized to the Step 4 source seed. Growth uses its own freshly seeded Mulberry32. Maximum face attempts: 30,000; actual total: **7534** for 144 retained maps. Shape rejects: 764; logic-filter rejects: 6626. Each complete puzzle count is exact or explicitly marked incomplete on a 2,000,000-node limit; no recorded construction count hit that limit.

Source | Face | Growth attempts | Shape rejects | Logic rejects | Retained
--- | --- | --- | --- | --- | ---
high | front | 322 | 46 | 264 | 12
high | back | 435 | 49 | 374 | 12
high | left | 243 | 52 | 179 | 12
high | right | 253 | 41 | 200 | 12
high | top | 545 | 47 | 486 | 12
high | bottom | 224 | 66 | 146 | 12
moderate | front | 216 | 44 | 160 | 12
moderate | back | 754 | 60 | 682 | 12
moderate | left | 2178 | 191 | 1975 | 12
moderate | right | 569 | 20 | 537 | 12
moderate | top | 1528 | 134 | 1382 | 12
moderate | bottom | 267 | 14 | 241 | 12

## Global solver and independent verification

The primary counter is one global exact-cover search over the **218 canonical physical cells**. Each cell option covers the row, column and local-region equation for **every incident face**: 3 equations for an interior cell, 6 for an edge-interior cell and 9 for a corner. All **126 equations** (42 rows, 42 columns, 42 regions) must be covered exactly once. Face labels are part of region keys, preventing accidental merging of equal colors. No ground-truth occupancy, boundary facts, or face-solution lists constrain this search.

Depth-first search chooses the uncovered equation with fewest compatible physical-cell options. Every compatible option is explored. A count is reported as exact only after exhaustive traversal; reaching a solution limit or node limit returns an explicit incomplete result. Saved unique examples are counted with **no solution-count cutoff** and exhausted search. Up to 20 witness solutions are retained, independently of the exact count.

A second solver independently enumerates each face using the existing single-face solver and joins the six complete face domains, checking **both occupied and empty** shared references for equality. It agrees with the canonical exact-cover counter on the complete solution sets of A–D. This second approach is a verification oracle, not the primary construction model.

## Saved board counts and reduction by sharing

Board | front | back | left | right | top | bottom | Global | Independent face combinations
--- | --- | --- | --- | --- | --- | --- | --- | ---
A | 80 | 84 | 50 | 56 | 25 | 87 | 1 | 40924800000
B | 80 | 26 | 64 | 56 | 74 | 24 | 1 | 13239582720
C | 2 | 26 | 8 | 12 | 60 | 87 | 1 | 26058240
D | 80 | 84 | 50 | 90 | 25 | 87 | 2 | 65772000000

The product column counts unconstrained combinations of isolated face answers; most disagree on shared cells. Exactly 1, 1, 1, and 2 combinations respectively survive full canonical consistency. This is an exact before/after comparison, not a claim that all combinations were ever physically valid. All three unique examples have **six ambiguous faces**, so no isolated face can determine its own complete answer unaided.

- **A — several locally ambiguous faces:** first successful refinement, satisfying the stronger all-six condition. It is the direct one-cell refinement of D.
- **B — all locally ambiguous:** second successful refinement, a different region board on the same answer.
- **C — relatively easy-looking candidate:** lowest sum of local counts among the remaining successful refinements. This is a transparent construction heuristic, **not a human-difficulty rating**. It still has no singleton regions, so forced-remaining-cell deduction alone has no starting move. Human playtesting and stronger readable deductions are needed before calling it easy.
- **D — ambiguous comparison:** the assembled board with the smallest global count above one, before refinement. Both canonical solutions are saved; its alternative can be inspected separately in examples.json.

Refinement outcomes (no broad statistical inference intended):

Source | Assembly index | Before | After | Final local counts (front/back/left/right/top/bottom) | Cell transfers
--- | --- | --- | --- | --- | ---
moderate | 20 | 2 | 1 | 80/84/50/56/25/87 | 1
moderate | 88 | 2 | 1 | 80/26/64/56/74/24 | 1
moderate | 63 | 4 | 1 | 80/72/8/88/72/26 | 2
moderate | 15 | 6 | 1 | 20/16/59/56/72/60 | 2
moderate | 19 | 6 | 1 | 2/26/8/12/60/87 | 2
moderate | 36 | 6 | 1 | 2/96/32/32/20/30 | 2
moderate | 95 | 6 | 1 | 72/40/82/18/68/30 | 2
high | 25 | 7 | 1 | 27/50/12/18/24/92 | 3
high | 95 | 8 | 1 | 100/68/84/80/40/32 | 3
high | 54 | 12 | 1 | 48/96/92/8/32/63 | 3
moderate | 73 | 12 | 1 | 2/84/64/64/64/87 | 1
moderate | 76 | 12 | 1 | 80/21/82/64/28/26 | 4

## Presentation-only color continuity

After the region boundaries are fixed, relabel the seven colors independently on each face. Keep front fixed as an arbitrary color anchor. For each other face, enumerate all 7! label permutations and choose a strict improvement in matching labels along its four physical edges; sweep up to ten times. This coordinate-descent procedure preserves every region's cells, connectivity and logical solution set. It is a local improvement, not an optimality claim.

The metric is matching labels across **84 face-pair boundary positions** (12 edges × 7 cells). A corner contributes three pairwise comparisons, one for each incident physical edge. It is not 84 distinct physical cells. Full-edge agreement means all seven corresponding labels match.

Board | Matching positions before | After / 84 | Fully matching edges / 12
--- | --- | --- | ---
A | 18 | 51 | 0
B | 25 | 49 | 0
C | 15 | 41 | 0
D | 18 | 51 | 0

Partial same-color continuity is feasible without modifying logic. Perfect consistency is not achieved in these examples and must not be implied by the palette. A future display must retain face boundaries and explain “one per color region **on each face**”; a shared cell with mismatched labels needs a clear face-specific presentation. No visual assets or renderer were created here.

## Debug boards and separate answer overlays

The unfolding is the fixed 3A net: top above front; left–front–right–back across the middle; bottom below front. Rows increase down, columns right. Region nets contain only R O Y G B I V. Separate answer overlays use U and ., with shared unicorns repeated as face references. A player would receive only the region board; overlays are debug answers, not clues.

### Board A

Source moderate, answer seed 0, assembly 20; global count **1**.

Face | Region sizes R O Y G B I V | Leaf cells
--- | --- | ---
front | 4, 2, 13, 7, 7, 11, 5 | 9
back | 3, 14, 7, 3, 10, 6, 6 | 13
left | 5, 5, 9, 16, 7, 2, 5 | 9
right | 8, 4, 6, 12, 9, 5, 5 | 12
top | 3, 3, 10, 11, 12, 7, 3 | 11
bottom | 11, 10, 6, 4, 4, 10, 4 | 11

Region board:

```text
                TOP
                R R Y Y Y O O
                R B B B Y O Y
                B B B B Y Y Y
                B B B I I Y Y
                B B I I G G G
                V I I G G G G
                V V I G G G G

LEFT            FRONT           RIGHT           BACK
R R R G G V V   O R R R R G G   G G G G O O O   O Y Y Y Y R R
R R G G G V V   O Y Y I I G G   G G G G G Y O   O O Y Y Y O R
G G G G I I V   Y Y Y I I I G   G G G Y Y Y V   O O O O O O O
G G G G Y Y Y   Y Y Y I I G G   B B B Y V V V   I O O O B B G
G G G Y Y Y Y   Y Y Y I I B B   B B B Y R V I   I I I B B G G
B B B Y O Y O   Y V V I I B B   B B R R R I I   I V V V B B B
B B B B O O O   Y V V V B B B   B R R R R I I   I V V V B B B

                BOTTOM
                O O R R R R R
                O O O Y R R R
                O O Y Y R R R
                O O Y Y Y G G
                B O I I I G G
                B I I I I I I
                B B V V V V I
```

Separate answer overlay:

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

Region edits before color relabeling (zero-based face cells, original numeric region IDs):

Face | Row | Column | From region | To region | Global before → after
--- | --- | --- | --- | --- | ---
right | 1 | 4 | 0 | 1 | 2 → 1

### Board B

Source moderate, answer seed 0, assembly 88; global count **1**.

Face | Region sizes R O Y G B I V | Leaf cells
--- | --- | ---
front | 3, 9, 6, 8, 2, 8, 13 | 12
back | 3, 4, 6, 11, 15, 3, 7 | 10
left | 9, 14, 5, 4, 10, 3, 4 | 11
right | 3, 10, 10, 9, 8, 6, 3 | 9
top | 7, 4, 3, 3, 15, 10, 7 | 14
bottom | 5, 3, 12, 6, 4, 13, 6 | 8

Region board:

```text
                TOP
                R R R O O O Y
                R R R I B O Y
                R I I I B B Y
                I I I I B B B
                V I I B B B B
                V V B B G B B
                V V V V G G B

LEFT            FRONT           RIGHT           BACK
R R R R V V V   O R R R Y G G   B B B Y Y Y Y   Y Y O O R R R
R R R R Y Y V   O O O Y Y G G   B B B Y Y Y Y   Y Y O O B B B
G G R I O Y Y   O O Y Y Y G G   B B O R R Y Y   Y Y G G G B B
B G G I O O Y   O V V V I G G   O O O R G G G   G G G G G B B
B B B I O O O   O V V V I I B   O O O O G G G   G G B B B B B
B B B O O O O   O V V V I I B   O O I I I G G   G V V V V B B
B B B O O O O   V V V V I I I   I I I V V V G   I I I V V V B

                BOTTOM
                O V V V V I I
                O O Y V V I I
                Y Y Y R R I I
                B Y Y R R R I
                B Y Y G G I I
                B Y Y G G I I
                B Y Y G G I I
```

Separate answer overlay:

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

Region edits before color relabeling (zero-based face cells, original numeric region IDs):

Face | Row | Column | From region | To region | Global before → after
--- | --- | --- | --- | --- | ---
bottom | 2 | 3 | 2 | 3 | 2 → 1

### Board C

Source moderate, answer seed 0, assembly 19; global count **1**.

Face | Region sizes R O Y G B I V | Leaf cells
--- | --- | ---
front | 2, 2, 9, 10, 3, 15, 8 | 12
back | 3, 6, 4, 15, 7, 3, 11 | 10
left | 2, 7, 8, 11, 11, 2, 8 | 12
right | 6, 10, 7, 6, 4, 3, 13 | 8
top | 4, 4, 8, 15, 4, 6, 8 | 12
bottom | 11, 6, 10, 4, 4, 4, 10 | 11

Region board:

```text
                TOP
                R R R R O O O
                G G G G G O Y
                G G G G Y Y Y
                G G G G G Y Y
                V V G B B Y Y
                V V V B I I I
                V V V B I I I

LEFT            FRONT           RIGHT           BACK
G G G G V V R   R R Y Y Y G G   G Y Y Y Y O O   O O Y Y R R R
G G G O V V R   O O Y Y G G G   G G Y Y Y O O   O O Y Y G G G
G G G O V Y Y   Y Y Y G G G G   G G B B O O O   O O V V V G G
G O O O V Y Y   Y I I I I G B   G B B V O O O   V V V V V G G
O O B V V Y Y   V I I I I B B   I R R V V V V   V V G G G G G
B B B B I I Y   V V V I I I I   I R R V V V V   V B B B B G G
B B B B B B Y   V V V V I I I   I R R V V V V   I I I B B B G

                BOTTOM
                Y Y R R R R R
                Y Y Y O R R R
                Y Y O O R R R
                Y Y O O O G G
                B Y V V V G G
                B V V V V V V
                B B I I I I V
```

Separate answer overlay:

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

Region edits before color relabeling (zero-based face cells, original numeric region IDs):

Face | Row | Column | From region | To region | Global before → after
--- | --- | --- | --- | --- | ---
front | 2 | 3 | 2 | 3 | 6 → 2
right | 2 | 4 | 2 | 3 | 2 → 1

### Board D

Source moderate, answer seed 0, assembly 20; global count **2**.

Face | Region sizes R O Y G B I V | Leaf cells
--- | --- | ---
front | 4, 2, 13, 7, 7, 11, 5 | 9
back | 3, 14, 7, 3, 10, 6, 6 | 13
left | 5, 5, 9, 16, 7, 2, 5 | 9
right | 8, 5, 6, 11, 9, 5, 5 | 11
top | 3, 3, 10, 11, 12, 7, 3 | 11
bottom | 11, 10, 6, 4, 4, 10, 4 | 11

Region board:

```text
                TOP
                R R Y Y Y O O
                R B B B Y O Y
                B B B B Y Y Y
                B B B I I Y Y
                B B I I G G G
                V I I G G G G
                V V I G G G G

LEFT            FRONT           RIGHT           BACK
R R R G G V V   O R R R R G G   G G G G O O O   O Y Y Y Y R R
R R G G G V V   O Y Y I I G G   G G G G O Y O   O O Y Y Y O R
G G G G I I V   Y Y Y I I I G   G G G Y Y Y V   O O O O O O O
G G G G Y Y Y   Y Y Y I I G G   B B B Y V V V   I O O O B B G
G G G Y Y Y Y   Y Y Y I I B B   B B B Y R V I   I I I B B G G
B B B Y O Y O   Y V V I I B B   B B R R R I I   I V V V B B B
B B B B O O O   Y V V V B B B   B R R R R I I   I V V V B B B

                BOTTOM
                O O R R R R R
                O O O Y R R R
                O O Y Y R R R
                O O Y Y Y G G
                B O I I I G G
                B I I I I I I
                B B V V V V I
```

Separate answer overlay:

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

## Design answers

1. **Can rainbow cubes be constructed reliably around complete answers?** Yes for the tested saved sources: seeded growth guarantees the answer survives, and bounded rejection produces the desired connected, non-singleton maps. Targeted boundary edits then produced twelve unique constructions. Arbitrary source/shape combinations are not guaranteed to succeed within the limits.
2. **Can the full cube be unique with no revealed unicorns?** **Yes. A, B and C each have exactly one global solution**, independently verified, with no revealed unicorns or X marks.
3. **Can unique cubes have ambiguous faces?** **Yes: all six faces are ambiguous on A, B and C.** Their isolated counts range from 2 to 87.
4. **How much does sharing reduce ambiguity?** The table above gives exact local products and global survivors. For A, 40924800000 independent face combinations collapse to one; D retains two. Sharing resolves boundary alternatives, while the face-local regions eliminate the interior flexibility found in Step 4.
5. **Is same-color edge continuity feasible without complicating logic?** Partial continuity improves substantially by color permutation alone. It is optional presentation; it never merges logical regions. Complete color agreement is not established and mismatched shared-cell colors need careful presentation.
6. **Ready for a playable 2D prototype?** **Yes, the saved boards are logically verified fixtures for a separately authorized prototype and playtesting.** We have not established human solvability by a restricted rule set, difficulty, elegance or usability. C is only relatively easy-looking by its local-count heuristic. The prototype should test face-local color interpretation, shared-cell interaction and whether cross-face deductions are understandable. No rendering or gameplay was implemented.

## Reproduction, tests and artifacts

Run from the repository root with Node.js and no dependencies:

```sh
node experiments/rainbow-cube/run.mjs
node --test experiments/rainbow-cube/model.test.mjs
node experiments/rainbow-cube/report.mjs
```

The five rainbow test groups check all 144 retained maps and seeds; all four saved boards with two independent complete solvers; deterministic refinement and color relabeling with solution-set preservation; exhaustive n=2 physical subsets with face-local regions including unsatisfiable cases; malformed maps/answers and incomplete-count handling. Saved answers and all alternative witnesses obey the fixed shared topology. Existing topology and single-face tests are also run as regression checks.

- [examples.json](rainbow-cube/examples.json): four final boards, original maps, growth seeds, refinement histories, color permutations, answers, exact global counts and witnesses, local counts and shape metrics.
- [examples.txt](rainbow-cube/examples.txt): region nets and separate answer overlays.
- [pools.json](rainbow-cube/pools.json): all 144 retained face maps with seed and local counts.
- [results.json](rainbow-cube/results.json): exact face/global counts for every one of the 200 assembled cubes, all selected refinement outcomes, parameters and costs. Total construction time for this run: 9.44 seconds, excluding file writes; environment-dependent, not a benchmark.

The previous experiments remain complete and unchanged. Region constraints are strictly face-local; no global regions, clues, UI, rendering or gameplay were added.
