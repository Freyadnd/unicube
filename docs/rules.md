# Proposed rules and mathematical questions

The 3A coordinate topology is fixed. Step 4 validates complete placements under
face row/column rules. Step 5 constructs boards with face-local regions; global
regions remain out of scope, and presentation and gameplay remain unimplemented.

## Working assumptions

1. There are six cube faces, each with seven local rows and seven local columns.
2. A physical cell is either empty or contains one unicorn.
3. Every face has exactly one unicorn in each row and each column. Consequently, it sees exactly seven unicorns; the face-total rule is redundant if the row and column rules hold.
4. If two or three face-local cells represent one shared physical cell, they must have the same occupancy. A unicorn there counts toward the constraints of every incident face.
5. For Step 5, rainbow regions partition each face's 49 references into seven
   orthogonally connected regions labeled R O Y G B I V. A shared physical cell
   belongs to one region on each incident face; it still has one occupancy state.
6. Each face-local region contains exactly one unicorn. Its identity is
   (face, label); equal colors on different faces never merge constraints.
7. The desired outcome is a unique global occupancy assignment, with multiple face-local possibilities when neighboring information is withheld.
8. No additional unicorn adjacency restrictions are assumed.

## Design objective for the next experiments

We are **not** trying to make every individual face uniquely solvable. Controlled,
human-meaningful local ambiguity is desirable: the eventual target is
`solutions(face) > 1` with `solutions(global cube) = 1`, because neighboring
faces should resolve choices through shared cells. This is a design objective,
not an established feasibility result.

Experiment 2 remains strictly face-local: plant a permutation, grow seven
orthogonally connected regions around its seven cells, and measure small
solution sets and how true boundary-cell occupancy revelations distinguish
them. A boundary revelation is a hypothetical external fact, not an implemented
neighbor or a guarantee that a consistent cube can supply it. Region scope,
shared-cell identity, and all cube topology questions remain open.

Results and reproducible measurements are in
[Experiment 2](../experiments/results-solution-first.md).

## Fixed model for Step 4

Use exactly the Experiment 3A face frames and canonical physical IDs. A complete
placement is a set of occupied physical cells, with omitted cells empty. Every
face row and column contains exactly one unicorn; a shared physical unicorn
counts on every incident face. Every face consequently sees exactly seven.
No regions, colors, adjacency restrictions or player clues are included.

[Step 4 results](../experiments/results-complete-cube.md) verify 10,000 generated
answers using one global exact-cover search over physical cells. Every physical
cube edge is a full boundary row/column and therefore contains exactly one
unicorn including endpoints. With I interior, E edge-interior and C corner
unicorns, E+3C=12 and I+2E+3C=42, so the distinct total is 30+C. Corner counts
0–4 and every corresponding total 30–34 are attained. This establishes
complete-placement feasibility, not player-puzzle uniqueness.

## Fixed model and construction for Step 5

Use saved Step 4 placements as answers. Seed the seven regions on each face at
that face's answer cells, grow connected regions, then count the complete cube
with its rows, columns, face-local regions and canonical shared occupancy.
No unicorns or X marks are pre-revealed. Color agreement across edges is an
optional presentation preference, not an extra constraint or global region.

[Step 5 findings](../experiments/results-rainbow-cube.md) save three globally
unique boards with all six faces locally ambiguous, and a two-solution
comparison. Legal region-boundary edits eliminate competing answers while
preserving the saved solution. Two independent counters verify the examples.
This establishes logical construction feasibility, not human difficulty.

## Historical questions and remaining design questions

### Surface topology and cell identity

- Are boundary cells genuinely shared, or does each face own separate cells that are merely adjacent across an edge?
- If boundary cells are shared, how are all face coordinates identified consistently, including reversals of edge order and three-way corner identifications?
- Does a shared corner participate in one row and one column on each of its three faces?
- What physical geometry and neighbor relation represent shared cells? Are diagonal contacts meaningful?

One candidate model identifies the outermost rows and columns of six 7×7 face grids along cube edges. It would have `6×25 + 12×5 + 8 = 218` distinct cells: 150 face-interior cells, 60 non-corner edge cells, and eight corners. Separate face cells would instead give 294 cells. These are alternatives to test, not a committed design.

[Experiment 3A](../experiments/results-cube-topology.md) now implements and
verifies the shared-boundary candidate as an integer lattice on `[0,6]³`.
It fixes geometric frames with +x right, +y up, and +z front, and derives all
twelve edge mappings and eight corner triples by coordinate equality.
Its 218 physical cells account for all 294 face references. Physical neighbors
are the union of orthogonal face-local steps after identification. This is an
explicit convention for the topology experiment, not a final game rule;
Step 4 fixes this topology and row/column participation for complete placements;
region scope and player-puzzle feasibility remain unresolved.

### Counting and feasibility

- Can the row and column constraints be satisfied simultaneously under the chosen identifications?
- Which total unicorn counts are possible, and how does sharing restrict them?
- Can required edge or corner placements force contradictions on neighboring faces?

There are always 42 face–unicorn incidences under the proposed face constraints. In the shared-cell model, let `I`, `E`, and `C` count unicorns in interiors, on non-corner edges, and at corners. Any solution must satisfy `I + 2E + 3C = 42`, while the number of distinct unicorns is `I + E + C`. Thus, 42 face incidences do not imply 42 distinct unicorns.

### Rainbow regions

- Is a region a connected component, a named cell set, or every cell of one color? May one color label several distinct regions?
- Must every region contain one unicorn, or is only a specified subset relevant?
- Are regions defined globally or separately per face? How would a shared cell belong to a face-local partition?
- May regions cross edges and corners, and what adjacency defines their connectivity?
- Is the intended palette exactly seven colors? How many distinct regions may exist?

If every region in a global partition contains exactly one unicorn, the number of regions equals the number of distinct unicorns. In particular, just seven global regions cannot satisfy 42 face incidences when a unicorn is visible on at most three faces: seven unicorns supply at most 21 incidences. Color reuse or a different region scope therefore needs consideration.

### Uniqueness and local ambiguity

- Does “unique” mean one solution in fixed coordinates, or uniqueness up to cube rotations or reflections?
- What information does an isolated face retain: its visible regions, full cross-face region membership, or only constraints wholly contained on that face?
- How many locally valid assignments should each face admit, and how do we demonstrate that neighboring constraints remove them?
- Does every face need neighboring information, or is ambiguity required only for some faces?

For a face with only the one-per-row and one-per-column rules, placements correspond to permutations, giving `7! = 5,040` possibilities before region or neighboring constraints. A useful ambiguity test must define which additional constraints are retained.

### Deterministic generation

- Should experiments begin with handcrafted region partitions, or generate a solution first and then construct regions around it?
- Can a seeded procedure reliably produce satisfiable, globally unique puzzles with the required local ambiguity?
- How will generation handle failures reproducibly, and what evidence of uniqueness should it retain?
- Should generation run offline or in the browser, given the eventual size budget?

## Validation targets before gameplay

Future experiments should first formalize one candidate model, then test:

- Consistent cell identities and edge orientations, including corner equivalence and expected cell counts.
- Exactly one unicorn per row, column, and relevant region, with correct shared-cell counting.
- Region coverage, non-overlap, and connectivity if connectivity is required.
- Existence of solutions, followed by solution counting to distinguish none, one, and multiple.
- Global uniqueness and face-local ambiguity under explicit information and symmetry conventions.
- Reproducible results for identical seeds and parameters.

The coordinate topology, complete row/column placements and face-local rainbow
boards have now been verified. Global regions and gameplay remain unimplemented.
A separate [single-face baseline experiment](../experiments/results-single-face.md)
implements and measures exactly seven face-local connected regions with one
unicorn per row, column, and region. Its local definitions do not settle the
remaining design questions above.
