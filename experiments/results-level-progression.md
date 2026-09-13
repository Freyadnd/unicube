# Step 10 — Tutorial and progression feasibility

The development level format is `{id, maps, truth, activeFaces, fixed,
message}`. `activeFaces` filters row, column, and face-local region units;
canonical topology and player state remain global, so shared edges/corners
continue to synchronize.

Using Board C maps and truth as a targeted feasibility check, the existing
solver reports these unconstrained completion counts:

| active faces | completions |
|---|---:|
| front | 2 |
| front + right | 8 |
| front + right + top | 16 |
| all six | 1 |

Thus partial-face rules are mathematically sensible. The saved full cube is
unique; partial subsets retain ambiguity, which is useful for tutorial
teaching but means early curated levels may need selected clues or simpler
maps. The level descriptors and progress abstraction are implemented in
`src/levels.mjs`; no new puzzle data was generated.
