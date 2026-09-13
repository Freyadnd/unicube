# True small-cube campaign — Step 17

These are offline, deterministic solution-first constructions, not copied standalone faces. The existing `createTopology(n)` already implements the cube surface at every tested size; its geometry and canonical IDs were not changed.

| N | Face references | Interior (1 incidence) | Edge interior (2) | Corner (3) | Physical cells |
|---|---:|---:|---:|---:|---:|
| 3 | 54 | 6 | 12 | 8 | 26 |
| 4 | 96 | 24 | 24 | 8 | 56 |
| 5 | 150 | 54 | 36 | 8 | 98 |
| 7 | 294 | 150 | 60 | 8 | 218 |

Counts follow `6*(n-2)^2 + 12*(n-2) + 8`. Incidences sum to `6*n*n`. Regression tests exhaust every face reference and all twelve seams for each size.

## Construction and actual work

Run `node experiments/small-cubes/generate.mjs` offline to reproduce. `examples.json` is the readable source fixture; `search-stats.json` contains the recorded search measurements. No generator, seed selection, or uniqueness search runs in normal gameplay.

1. The existing global physical-cell exact-cover model supplies a valid complete placement at N=3,4,5.
2. Each face grows connected regions from its N planted unicorns. Growth is weighted against dominance. For the authored 3x3, the front center region is deliberately kept singleton to give an obvious first deduction.
3. The 3x3 is scaffolded with fixed unicorns and given exclusions. Candidate maps must preserve exactly two independent right-face and top-face solutions, each collapsed by its respective tutorial exclusion.
4. For N=4/5, choose fixed unicorns greedily by log reduction of independent local face counts, preferring sharing on ties. Retain eight/thirteen unplaced unicorns respectively. Require at least three locally ambiguous faces on N=5.
5. Exhaust global counting and compare the sole solution to the planted physical truth. Reload the saved JSON and repeat exact counting independently of the generator's candidate objects.

| N | Placement seed | Region seed base | Candidates | Connected/planted | Unique found | Rejections | Search time |
|---|---:|---:|---:|---:|---:|---:|---:|
| 3 | 3 | 230000 | 1 | 1 | 1 | 0 | 12 ms |
| 4 | 1704 | 250000 | 1 | 1 | 1 | 0 | 98 ms |
| 5 | 1705 | 270000 | 1 | 1 | 1 | 0 | 138 ms |

The first candidate satisfied each target with its intended assistance; no large survey was needed. These times are from the recorded run and will vary. Six consecutive region seeds are used per candidate. There is no claim about the success rate of unclued random cubes.

| Fixture | Global solutions | Fixed unicorns | Given exclusions | Unicorns left | Simple propagation |
|---|---:|---:|---:|---:|---|
| CUBE3 | 1 | 4 | 12 | 5 | solved, 2 rounds |
| CUBE4 | 1 | 6 | 0 | 8 | solved, 2 rounds |
| CUBE5 | 1 | 5 | 0 | 13 | solved, 3 rounds |

Independent face counts after initial givens, ordered front/back/left/right/top/bottom:

- 3x3: **1 / 1 / 1 / 2 / 2 / 1** (product 4).
- 4x4: **1 / 1 / 1 / 1 / 1 / 1** (product 1).
- 5x5: **1 / 2 / 1 / 1 / 3 / 8** (product 48).

Thus the 4x4 is intentionally heavily assisted and does not require cross-face information for uniqueness. The 5x5 retains uncertainty on three independent faces while the full cube is unique. All solve under the modest row/column/region forced-cell propagation analyzer; this is an approachable first set, not a demonstrated hard difficulty curve. Human timing/difficulty remains unmeasured. Expected meaningful actions: tutorial eight; 4x4 at least eight placements plus optional exclusions; 5x5 at least thirteen placements plus exclusions.

## Verified 3x3 teaching sequence

All coordinates below are one-based. Four fixed physical unicorns: `0,0,1`, `0,1,0`, `1,0,0`, `1,2,1`. The twelve excluded givens are recorded explicitly in `examples.json` and remain immutable. They survive Reset. Authored actions remain editable; the tutorial does not write answers into state.

1. Exclude **`1,0,2`**, front r3c2. The front center rainbow is a singleton requiring its unicorn; the other star in that column cannot be occupied.
2. Place **`1,1,2`**, front r2c2, in that singleton rainbow.
3. Exclude **`2,1,2`**, front r2c3 = right r2c1. The front middle row already contains its unicorn. The full front/right geometric edge pulses and the camera turns toward the right.
4. Place **`2,1,1`**, right r2c2. That right row now has only one possible position. Independent right-face completions decrease **2 → 1** from the shared exclusion, even though the prior interior front unicorn is not visible on the right.
5. Place **`2,0,2`**, right r3c1. The right middle column is now occupied; the bottom row has one possibility.
6. Exclude **`2,2,2`**, front r1c3 = right r1c1 = top r3c3. The right left column already contains its unicorn. The real front/right/top geometric corner and all three face representations pulse.
7. Place **`0,2,2`**, top r3c1. Independent top-face completions decrease **2 → 1** from the shared corner exclusion. The front/right interior placements do not themselves constrain the top face locally.
8. Guidance releases to “your turn.” Place the final **`2,2,0`**, top r1c3, to finish.

Eight meaningful actions = three single-tap exclusions and five double-tap placements (thirteen physical taps). Unnecessary marks are not required for completion. Regression tests verify every guided action against the stated face's independent solution domain under the preceding marks, not only against stored truth.

## Runtime integration

Normal campaign is CUBE3 → CUBE4 → CUBE5 → saved six-face L5 (N=7, six fixed unicorns, unchanged maps/truth). The previous seven stages remain at `?dev-campaign=legacy`. Canonical topology, full-cell picking, and the star/dot/unicorn interactions are reused at all sizes.

A first-entry Rules card explains symbols, controls, rows, columns, and rainbows. Edge/corner reminders become available after their tutorial actions. The 3x3 remains rotatable; pointerdown cancels any guided camera interpolation immediately. Short geometric strokes use the verified face normals to locate the actual edge/corner. There are no particles or new textures.

Small-size emoji font caps correspond nominally to 39%, 40%, and 43% of cell width; platform-native perceived glyph width varies. Seven-size rendering stays at its prior scale. Fixed unicorns now have a thin pearl ring, not an opaque cream disk.

No production archive was rebuilt. Browser readability, reveal timing, and actual human difficulty require playtesting.
