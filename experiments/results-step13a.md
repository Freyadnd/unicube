# Step 13A — onboarding and visual feasibility

The previous unicorn marker was a diamond made from two triangles, so it
read as an arrow or paper airplane at cell size. A friendlier prototype is a
small white octagonal head/body with two ear triangles and a contrasting horn
triangle; it uses only procedural vertices and no font or image asset. The X
is a rounded-feel, thicker line pair and remains visually secondary.

The key 7×7 assumptions are concentrated in the current cube topology,
renderer face subdivision, picking conversion, and the readable level data.
The single-face solver already accepts arbitrary `n` (3, 4, 5, and 7), and
row/column/region checks are parameterized there. The runtime player and cube
renderer still hard-code seven rows, columns, and cell dimensions; topology
must remain 7×7. A small single-face tutorial special case is therefore
low-to-moderate cost, but should not alter cube topology.

Recommended progression: 3×3 guided → 4×4 guided → 5×5 mostly independent →
7×7 face → two-face edge → three-face corner → full cube. If implementation
cost rises, retain 7×7 and author guided steps instead.

The smallest guidance representation prototyped is
`[targetPhysicalIds, shortText, expectedPhysicalId]`, defined in
`src/tutorial.mjs`. It can be packed later without shipping a solver.

The active face already has a modest dimensional treatment from the cube
renderer, so the same frame can foreshadow folding into the full cube.
