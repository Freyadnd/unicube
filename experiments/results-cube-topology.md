# Experiment 3A — Cube surface topology

## Finding and scope

**Yes: these six 7×7 coordinate systems consistently describe one shared-boundary cube surface.** There are **218 canonical physical cells**, represented by **294 face-local references**. All seven topology test groups pass, including every reference, every seam position in both directions, and every corner triple.

This is a development-only coordinate experiment. It implements no puzzle constraints, placements, regions, solution counting, global generation, rendering, WebGL, UI, gameplay, or assets. Experiments [1](results-single-face.md) and [2](results-solution-first.md) were inspected and left complete; their measurement runs were not repeated. Their findings motivate this study but are not inputs to the topology module.

## Analytical verification, before implementation

For integer n ≥ 2, decompose the cube into disjoint strata:

- Each of six open face interiors contributes (n−2)² cells: **6(n−2)²**.
- Each of twelve open physical edges contributes n−2 cells: **12(n−2)**. There are three choices of varying Cartesian axis and four choices of the fixed endpoint coordinates on the other axes.
- Three endpoint coordinates independently select one of two values, giving **2³ = 8 corners**.

Total physical cells: 6(n−2)² + 12(n−2) + 8 = **6n² − 12n + 8**. For n ≥ 3 this also equals n³ − (n−2)³, the integer cube shell. The stratum formula works at n=2 (eight corners only); n=1 is degenerate and rejected.

A face-interior cell lies on one face plane, an edge-interior cell on two, and a corner on three. Hence the incidence sum is 6(n−2)² + 2·12(n−2) + 3·8 = **6n²**.

At n=7:

Stratum | Physical cells | Faces per cell | Face references
--- | --- | --- | ---
Face interior | 150 | 1 | 150
Edge interior | 60 | 2 | 120
Corner | 8 | 3 | 24
Total | 218 |  | 294

These formulas were checked analytically before writing the topology implementation. The exhaustive tests reproduce them independently.

## Geometric convention

Use a right-handed Cartesian frame with **+x right, +y up, +z toward the front**. The cube occupies [0,m]³, where m=n−1=6. The six exterior face planes are front z=m, back z=0, left x=0, right x=m, top y=m, bottom y=0.

Each local grid uses row increasing downward and column increasing rightward in the text net below. For a face f, define:

**P(f,r,c) = m·O(f) + r·R(f) + c·C(f)**.

O is a dimensionless origin corner, R is the unit row direction, and C is the unit column direction. All arithmetic is exact integer arithmetic. The outward normal is **C × (−R)**, so the frames consistently describe exterior views rather than mirrored interior views.

Face | O (multiply by m) | R (row +1) | C (column +1) | Outward normal
--- | --- | --- | --- | ---
front | (0, 1, 1) | (0, -1, 0) | (1, 0, 0) | (0, 0, 1)
back | (1, 1, 0) | (0, -1, 0) | (-1, 0, 0) | (0, 0, -1)
left | (0, 1, 0) | (0, -1, 0) | (0, 0, 1) | (-1, 0, 0)
right | (1, 1, 1) | (0, -1, 0) | (0, 0, -1) | (1, 0, 0)
top | (0, 1, 0) | (0, 0, 1) | (1, 0, 0) | (0, 1, 0)
bottom | (0, 0, 1) | (0, 0, -1) | (1, 0, 0) | (0, -1, 0)

Equivalent explicit coordinates:

Face | P(row,column)
--- | ---
front | (c, m−r, m)
back | (m−c, m−r, 0)
left | (0, m−r, c)
right | (m, m−r, m−c)
top | (c, m, r)
bottom | (c, 0, m−r)

A **physical cell** here is a lattice location, not an area tile centered away from an edge. Two face references are equivalent precisely when their integer triples match. The canonical public ID is the normalized string **"x,y,z"**, for example "0,6,6". A cell record also exposes its numeric coordinate triple and all face references. This deliberately favors mathematical clarity over byte size. IDs are interpreted within a topology of a specified n; they are not globally size-qualified IDs.

## API and adjacency derivation

[Topology module](cube-topology/topology.mjs) exports a default n=7 topology and createTopology(n). Its APIs are:

- faceCellToPhysical(face,row,col): canonical string ID.
- physicalToFaceCells(id): every {face,row,col} reference, including all three at corners.
- edges: twelve records with both incident face sides, preserved/reversed order, all n shared IDs, and n−2 non-corner IDs.
- mapEdge(face,side,index): neighboring face reference plus target side, target index, and orientation.
- corners: eight physical-cell records with their three references.
- physicalNeighbors(id): distinct orthogonally adjacent physical IDs after gluing the local grids.

Arrays and records exposed by the topology are immutable. Invalid faces, sides, indices, noncanonical IDs and interior-volume coordinates are rejected.

No edge pair table is used to construct topology. The implementation maps each of the 24 local sides geometrically, groups sides with identical unordered endpoint pairs, and checks equality of every sample either in the same or reverse order. There must be exactly two face sides in each group. The explicit seam table lives only in tests as an independent expected result.

**Side index convention:** top/bottom use column c increasing 0→6; left/right use row r increasing 0→6. Preserved means j=i; reversed means j=6−i. These labels are relative to increasing row/column, **not** a clockwise traversal of a face boundary.

## All twelve physical edge mappings

Face side | Neighbor side | Order
--- | --- | ---
front top | top bottom | preserved
front right | right left | preserved
front bottom | bottom top | preserved
front left | left right | preserved
back top | top top | reversed
back right | left left | preserved
back bottom | bottom bottom | reversed
back left | right right | preserved
left top | top left | preserved
left bottom | bottom left | reversed
right top | top right | reversed
right bottom | bottom right | preserved

Every row represents an undirected pair. Each physical edge contains seven shared positions: five edge-interior cells and two endpoints. Endpoints are also on a third face and on three physical edges; the explicit choice of side in mapEdge removes any ambiguity about which neighboring face is requested.

For example, front(0,i) and top(6,i) both map to (i,6,6), preserving order. Back(0,i) maps to (6−i,6,0), which is top(0,6−i), reversing order. All remaining rows follow from the same coordinate equality.

**Reference conversion is not movement.** mapEdge re-expresses the same physical cell on its neighboring face. Physical stepping is the union of valid one-row or one-column steps from every representation. It neither duplicates the shared edge cell nor adds a jump across it. A non-corner seam cell has four neighbors: two along the seam and one inward on each incident face. Corners have three neighbors. No diagonal adjacency or orientation-transport rule for a moving object is defined.

## All eight corner mappings

All local coordinates below are zero-based:

Physical (x,y,z) | All three face-local (row,col) references
--- | ---
(0, 0, 0) | back(6,6) ↔ left(6,0) ↔ bottom(6,0)
(0, 0, 6) | front(6,0) ↔ left(6,6) ↔ bottom(0,0)
(0, 6, 0) | back(0,6) ↔ left(0,0) ↔ top(0,0)
(0, 6, 6) | front(0,0) ↔ left(0,6) ↔ top(6,0)
(6, 0, 0) | back(6,0) ↔ right(6,6) ↔ bottom(6,6)
(6, 0, 6) | front(6,6) ↔ right(6,0) ↔ bottom(0,6)
(6, 6, 0) | back(0,0) ↔ right(0,6) ↔ top(0,6)
(6, 6, 6) | front(0,6) ↔ right(0,0) ↔ top(6,6)

## Unfolded cube debug net

Each box is viewed from the exterior. Columns increase rightward and rows downward on this sheet. The top attaches to front's top, bottom to front's bottom, and the horizontal strip is left–front–right–back. The gaps are text spacing, not extra cells. The four local corner labels in each box make the global coordinates independently inspectable. Cut seams are identified by the twelve-edge table above when folded.

```text
                                  +-------------------------------+
                                  | TOP                           |
                                  | c+ --> +x                     |
                                  | r+ down +z                    |
                                  | (0,0)=0,6,0                   |
                                  | (0,6)=6,6,0                   |
                                  | (6,0)=0,6,6                   |
                                  | (6,6)=6,6,6                   |
                                  +-------------------------------+
+-------------------------------+ +-------------------------------+ +-------------------------------+ +-------------------------------+
| LEFT                          | | FRONT                         | | RIGHT                         | | BACK                          |
| c+ --> +z                     | | c+ --> +x                     | | c+ --> -z                     | | c+ --> -x                     |
| r+ down -y                    | | r+ down -y                    | | r+ down -y                    | | r+ down -y                    |
| (0,0)=0,6,0                   | | (0,0)=0,6,6                   | | (0,0)=6,6,6                   | | (0,0)=6,6,0                   |
| (0,6)=0,6,6                   | | (0,6)=6,6,6                   | | (0,6)=6,6,0                   | | (0,6)=0,6,0                   |
| (6,0)=0,0,0                   | | (6,0)=0,0,6                   | | (6,0)=6,0,6                   | | (6,0)=6,0,0                   |
| (6,6)=0,0,6                   | | (6,6)=6,0,6                   | | (6,6)=6,0,0                   | | (6,6)=0,0,0                   |
+-------------------------------+ +-------------------------------+ +-------------------------------+ +-------------------------------+
                                  +-------------------------------+
                                  | BOTTOM                        |
                                  | c+ --> +x                     |
                                  | r+ down -z                    |
                                  | (0,0)=0,0,6                   |
                                  | (0,6)=6,0,6                   |
                                  | (6,0)=0,0,0                   |
                                  | (6,6)=6,0,0                   |
                                  +-------------------------------+
```

This is text/debug output only. The five uncut hinges preserve order in this net; the remaining seven physical edges are cut seams. [net.txt](cube-topology/net.txt) is the standalone generated output.

## Reproduction and exhaustive verification

No dependencies are required. From the repository root:

```sh
node --test experiments/cube-topology/topology.test.mjs
node experiments/cube-topology/report.mjs
```

The report command regenerates this report, net.txt, and [topology.json](cube-topology/topology.json), containing frames, all 218 canonical records, all twelve edges and eight corner triples.

The seven passing test groups cover:

1. All six geometric frames, unit directions, orthogonality, and outward handedness.
2. All 294 reference round trips, independent explicit coordinate equations, every cell's incidence classification, and an independent enumeration of the entire 7³ integer cube shell.
3. All twelve explicitly expected edge pairs at all seven indices in **both directions** (168 directed cases), exact reversals, reciprocal mappings, 24 distinct face sides, and 60 distinct non-corner shared edge cells.
4. All eight independently specified corner triples, each with exactly three different faces and three physical edges.
5. Every cell's neighbors against independently computed Cartesian Manhattan-distance-one adjacency; symmetry, no self-loops, degree four except degree-three corners, and connectivity. The resulting graph has 432 undirected elementary links; with 216 elementary surface quadrilaterals, 218−432+216=2 provides an additional Euler consistency check. Elementary links are distinct from the twelve full cube edges.
6. Generalization to n=2,3,4,8, including incidence counts and every seam coordinate; n=2 correctly has no edge-interior cells.
7. Invalid inputs, immutable data and deterministic reconstruction.

## Remaining convention choices

**There is no unresolved mapping ambiguity within this convention.** Face axes, edge indexing, physical identity, corner incidence and orthogonal physical neighbors are explicit. Other face rotations or axis choices would change preserved/reversed labels while describing an isomorphic cube; callers must use this documented convention consistently. The net is one valid cut of the surface, not a unique unfolding.

The experiment commits only to this candidate shared-boundary lattice model. It does not decide physical tile footprints, diagonal neighbors, or a directional stepping convention at corners. It does not establish any puzzle feasibility claim. No work beyond topology was performed.
