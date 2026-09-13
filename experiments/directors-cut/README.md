# Director's Cut constellation bank — first pass

This bank is an offline search result, not browser-time generation. The runtime
selects one of twelve verified 7×7 shared-surface puzzles by its immutable ID.
`?s=10126` refers to that stored puzzle exactly; `New Constellation` advances
through the saved bank and wraps. A numerical ID is **not** a procedural seed.

## Existing research reused

- `cube-topology/topology.mjs` generates the six oriented face frames and
  canonical physical cells for any N. At N=7 it has 294 face references and 218
  physical cells. Edge interiors have incidence two and corners incidence three.
- `complete-cube/model.mjs` searches valid planted shared-surface solutions.
  This first bank uses its saved seed-0 and seed-12 answers. Both are independently
  validated before and after region construction.
- `rainbow-cube/model.mjs` grows connected face-local regions around the seven
  planted unicorns, counts global exact-cover solutions, and refines legal region
  boundaries against rival solutions. Its 144 saved face maps form the starting
  pool. Region labels remain `(face, color)`, never global across edges.
- `single-face/model.mjs` enumerates local row/column/region placements. The
  global counter and an independent face-domain join are both available offline.
- `small-cubes/analyze.mjs` contains the simple unit-propagation heuristic. It
  stalls initially on these no-given puzzles; that is recorded honestly rather
  than described as a human difficulty rating.

Naive random region maps are not used. The earlier 10,000-map single-face
experiment found 52.72% unsatisfiable, 0.12% unique and 47.16% multiple, with
mean 32.29 solutions. Solution-first growth guarantees a planted answer, while
global exact counting and refinement establish uniqueness.

## Reproduction and quality

Run `npm run generate:directors`. The deterministic assembly seed is
`20260913`. Each of 300 attempts selects six already planted, connected
face-local maps from the saved pool; all 300 are exhaustively counted. At most
26 low-count candidates (alternating the two planted source answers) are eligible
for up to six legal refinement moves. Search stops when twelve distinct boards
pass the filters. Canonical region relabeling prevents color-name-only duplicates.
The output is `directors/constellations.json`; timing and rejection statistics
are in `search-report.json`.

Hard acceptance filters, implemented in `analysis.mjs`:

1. Exact global count **one** and saved truth equal to its sole solution.
2. Every isolated face has **2–100** legal placements.
3. Product of six local counts is between **1 million and 100 billion**.
   This rejects both nearly forced and extremely broad independent domains.
4. Pairwise shared-boundary arc consistency removes at least two face-domain
   alternatives and strictly reduces the domain on at least two faces. This is
   evidence of cross-face information, not a human-solver proof.
5. Every connected region has **2–18** cells, and each face has at most **14**
   one-neighbor leaf cells, retaining the prior growth-shape guards.
6. At most two fixed unicorns; this first bank uses **zero**.

The arc-consistency analysis independently enumerates face solutions and
repeatedly removes a face placement if no neighboring face placement agrees on
*every* shared occupied/empty cell. It records rounds, removals and remaining
domain sizes. Unlike the exact global solver, pairwise consistency alone does
not prove uniqueness. `globalNodes`, local counts, products, propagation rounds,
and all other metadata are measured from the saved maps. No score is shown as a
human difficulty claim.

The recorded run searched **300** assemblies, refined **13**, and accepted
**12** distinct puzzles (4% of assemblies), taking about **4.49 seconds** on
the recorded machine. Initial global counting used about **2.03 seconds** and
refinement about **2.36 seconds**. These wall times are environment dependent.
The twelve region partitions use two planted complete solutions, six puzzles
from each. Arc consistency fully resolves eleven of the twelve; one requires
higher-order coupling. Simple row/column/region singleton propagation solves
none from the empty state, so human playtesting remains essential before
claiming these make a balanced difficulty ladder.

`#10257`, for example, has local counts `[48,16,68,24,48,6]`,
**360,972,288** independent face combinations, and exactly **one** shared-cube
solution. It has zero givens; pairwise boundary propagation removes 204 local
possibilities over three rounds.
