# UNICUBE --- Building a Globally Unique Puzzle on the Surface of a Cube

> Six faces. Shared stars. One solution.

UNICUBE is my JS13K 2026 game: a spatial logic puzzle about placing
unicorns across rainbow-colored regions on the surface of a cube.

The final rules are simple:

-   each face is an N×N grid;
-   each row contains exactly one unicorn;
-   each column contains exactly one unicorn;
-   each rainbow region contains exactly one unicorn;
-   cells on cube edges are shared by two faces;
-   cells on cube corners are shared by three.

What turned out to be much less simple was finding puzzles where those
rules actually produce something interesting.

The project started as a visual idea --- a pastel cube covered in
unicorns and constellations --- and gradually turned into an experiment
in constraint solving, topology, puzzle generation, and aggressive
browser-game compression.

This is the story of how it got there.

## 1. The original hypothesis

The first idea was essentially:

> What if a Queens-style region puzzle wrapped around a cube?

Each face would contain a 7×7 board partitioned into seven
rainbow-colored regions. A player would place one unicorn in every row,
column, and region.

But simply putting six puzzles on a cube wasn't interesting enough.

The important question became:

**Can information actually travel across the cube?**

If a cell lies on an edge, the two faces meeting at that edge shouldn't
merely display similar cells. They should refer to the **same physical
cell**.

Likewise, a corner should be one physical cell represented on three
faces.

That changes the puzzle from six independent constraint systems into one
global system.

## 2. First failure: random rainbow regions

My first generator produced random connected rainbow regions on a single
7×7 face.

It seemed reasonable: generate seven connected regions, then ask how
many placements satisfy the row, column, and region constraints.

I tested **10,000 random region maps**.

The result was not encouraging:

  Result                    Share
  ---------------------- --------
  No solution              52.72%
  Exactly one solution      0.12%
  Multiple solutions       47.16%

The average board had about **32.29 solutions**.

So naive random region generation was almost the opposite of a good
puzzle generator. Most boards were either impossible or wildly
ambiguous, while unique boards were extremely rare.

That changed the direction of the project.

Instead of asking:

> Can I generate pretty regions and hope they make a puzzle?

I started asking:

> Can I construct the solution first, then build constraints around it?

## 3. Before regions: understand the cube

Before generating more puzzles, I needed a precise model of the cube
itself.

A 7×7 cube has:

-   6 × 49 = **294 face-cell references**.

But many of those references describe the same physical location.

For an N×N cube surface, the number of unique physical cells is:

`6(N - 2)^2 + 12(N - 2) + 8`

For N = 7:

-   face interiors = 6 × 25 = 150
-   edge interiors = 12 × 5 = 60
-   corners = 8
-   **total physical cells = 218**

Their incidences reconstruct the 294 face references:

`150 × 1 + 60 × 2 + 8 × 3 = 294`

That distinction became fundamental to the implementation.

A face cell is a **representation**.

A physical cube cell is the **state**.

## 4. Canonical shared state

Every physical cell receives one canonical identity.

Interior cells appear on one face. Edge cells appear on two. Corner
cells appear on three.

If the player rules out an edge star on the front face, the
corresponding star on the neighboring face must disappear too.

If the player places a unicorn in a corner, all three incident faces
immediately see that unicorn.

This sounds like a rendering detail, but mathematically it is what makes
UNICUBE one puzzle instead of six.

Rainbow regions deliberately work differently: regions are
**face-local**.

The same physical edge or corner cell may therefore participate in a
different rainbow region on every incident face.

A single variable can simultaneously participate in row, column, and
region constraints across multiple faces. That is where much of the
global coupling comes from.

## 5. An unexpected property of complete cube solutions

Once the topology worked, I temporarily removed rainbow regions and
generated complete cube-wide unicorn arrangements satisfying only row
and column constraints.

I generated **10,000 complete cube solutions**.

One structural property kept appearing:

> Every physical cube edge necessarily contains exactly one unicorn,
> including its endpoints.

This was an early sign that the topology itself was already producing
strong coupling.

But row and column constraints alone were not enough. The rainbow
regions became the additional local constraints that could turn that
coupling into interesting deductions.

## 6. From six local puzzles to one global CSP

The next experiment combined:

-   cube topology;
-   shared physical cells;
-   face-local rainbow regions;
-   row constraints;
-   column constraints;
-   region constraints.

Then I wrote an offline solver that could count both the solutions
available to individual faces and the solutions available to the entire
connected cube.

This was the point where the original idea finally worked.

Several generated boards were highly ambiguous when their faces were
considered independently, yet had exactly **one global solution** once
edge and corner identities were enforced.

That became the central design principle of UNICUBE:

> **Local ambiguity, global uniqueness.**

## 7. The 5×5 result that convinced me

The clearest example appears in the 5×5 constellation used in the game.

If its six faces are solved independently, their local possibilities
combine into:

**48 possible face combinations.**

But when those same faces are treated as representations of one physical
cube --- sharing their edge and corner cells --- the number of solutions
becomes:

**1.**

`48 local combinations → shared cube topology → 1 global solution`

That is probably the single number that best explains why UNICUBE
exists.

The cube is not just presentation. It is part of the constraint system.

## 8. Why the game doesn't generate puzzles at runtime

At one point I considered making every run different with a random seed.

That would have enabled shareable constellations such as
`CONSTELLATION #4821`.

But the experiments had already shown why unconstrained random
generation was dangerous. A generated board can easily be unsatisfiable,
massively ambiguous, locally trivial, globally uninteresting, or simply
unpleasant to solve.

Guaranteeing puzzle quality would require carrying substantially more
generation and solving machinery into the browser. That was particularly
unattractive in a 13KB game.

So UNICUBE does the expensive work **offline**.

The development tools search puzzle space, count solutions, reject bad
candidates, and verify global uniqueness.

The runtime receives only puzzles that already passed those checks.

There is **no general-purpose puzzle solver or generator in the shipped
game**.

> Spend computation during construction; spend bytes on the experience.

## 9. Making the mathematics playable

The original prototype jumped almost immediately into a 7×7 cube.

Mathematically it worked. As a game, it didn't.

A new player had to understand rows, columns, rainbow regions,
exclusions, unicorn placement, cube rotation, shared edges, and shared
corners simultaneously.

So the campaign became four increasingly large **real cubes**:

`3×3 → 4×4 → 5×5 → 7×7`

### 3×3 --- FIRST STEPS

A heavily guided cube introduces the vocabulary and basic deductions.
The tutorial demonstrates shared geometry rather than explaining it only
in text.

### 4×4 --- CONSTELLATION

The player receives more independence while still having strong starting
deductions.

### 5×5 --- DEEPER

Local ambiguity becomes much more important. This is the puzzle where 48
independent face combinations collapse to one global solution.

### 7×7 --- UNICUBE

The full puzzle.

## 10. Teaching edges without teaching topology

One UX problem was surprisingly difficult:

How do you explain that two visible cells are actually one variable?

Text such as "edges are shared" was technically correct and practically
useless.

The tutorial eventually switched to demonstration.

When a shared edge cell changes, its representation on the neighboring
face changes too. The camera reveals the adjacent face and briefly
emphasizes the relevant geometry.

Corners use the same idea across three faces.

The goal is for the player to think:

> Oh, that's literally the same spot.

rather than:

> I have learned a new special rule called "shared edges."

## 11. Stars instead of Xs

Early versions used more conventional puzzle markings.

They worked, but visually the game started looking like a spreadsheet
wrapped around a cube.

The final visual language became celestial:

-   `✦` possible
-   `·` ruled out
-   `🦄` confirmed

A single click or tap toggles a possible star into a tiny extinguished
dot.

A double click or double tap places a unicorn.

The interaction became:

> Extinguish stars until the unicorns remain.

That metaphor fit the game's visual identity much better than filling a
board with X marks.

## 12. The visual direction

The final art direction became:

**Celestial Pastel / Vintage Unicorn / Constellation Puzzle**

The palette uses muted dusty rose, peach, butter cream, sage, powder
blue, indigo, and lavender.

The cube is rendered directly with WebGL.

There are no external textures, image assets, font downloads, or 3D
libraries. Even the unicorn is the native Unicode 🦄 rendered by the
browser/system.

This was partly an aesthetic choice and partly a size-budget choice.

> If it can't be generated with geometry, CSS, text, or a tiny amount of
> code, it probably doesn't belong in the game.

## 13. Face navigation became part of solving

A freely rotating cube is visually nice, but repeatedly dragging it
while solving a logic puzzle becomes tiring.

The final UI gives every face a compact progress indicator. Each
indicator shows how many unicorns are currently placed on that face and
also acts as navigation.

Clicking one automatically rotates that face toward the player.

A face is only considered complete when its row, column, and
rainbow-region constraints all pass. Shared unicorns naturally count on
every face they touch.

The result is simultaneously progress UI, spatial orientation,
navigation, and a reminder that all six faces belong to the same puzzle.

## 14. Hints without shipping a solver

I wanted hints, but did not want the production game to consult the
known solution or carry the offline solver.

The runtime hint system therefore recognizes only simple logical
deductions from the player's current state:

-   a row already contains its unicorn;
-   a column already contains its unicorn;
-   a rainbow region already contains its unicorn;
-   only one candidate remains in a constrained unit.

Hints point to **why** something can be deduced rather than editing the
board automatically.

This also lets the 3×3 tutorial and the later Hint button share the same
visual language.

## 15. The 13KB problem

The first naive production ZIP was about **21,935 bytes**.

That looked alarming until I inspected what was actually being shipped.
The archive still contained development structure that had no reason to
exist in the final game.

After separating development and production concerns, an early stripped
build reached **8,722 bytes**.

That version was comfortably under the limit, but subsequent work added
the actual campaign, tutorial, navigation, hints, camera behavior, and
final visual system.

The release pipeline became:

`readable source → production dependency graph → remove experiments/solver/dev routes → compact verified level data → bundle → minify → single index.html → ZIP`

The current release candidate is **12,634 bytes** against the JS13K
limit of **13,312 bytes**, leaving **678 bytes** of headroom.

The submission ZIP contains a single root-level `index.html`.

No runtime solver. No generator. No external assets. No network
dependency.

## 16. The most dangerous bug appeared after compression

One of the last bugs never appeared in the readable development version.

The clean bundled production build was already under the size limit, but
smoke-testing the **actual minified artifact** found a startup crash.

The production level descriptors were missing `activeFaces`. The packed
7×7 level also needed its board size explicitly restored during
encoding.

Both problems came from the production data transformation rather than
the game logic itself.

That was a useful final reminder:

> Passing source tests does not mean the submission artifact works.

For a size-constrained game, the compressed artifact is effectively
another target platform. It needs to be tested directly.

## 17. What is actually inside 13KB?

The shipped game includes, in some form:

-   a WebGL cube renderer;
-   generalized N×N cube topology;
-   four puzzle sizes;
-   verified puzzle data;
-   canonical shared physical state;
-   mouse/pointer interaction;
-   cube rotation;
-   camera targeting;
-   face navigation;
-   campaign progression;
-   a guided tutorial;
-   logical hints;
-   undo/reset;
-   rules UI;
-   transitions;
-   pastel region rendering;
-   and the unicorns.

The offline repository is intentionally much larger.

It contains the experiments, generators, solvers, analysis scripts,
fixtures, and tests used to decide what those 13KB should contain.

The size limit didn't eliminate the research.

It moved the research **outside the runtime**.

## 18. What I would do with more bytes

The first feature I would add is not sound or particles.

It would be a **verified constellation bank**.

Instead of generating arbitrary puzzles in the browser, I would search
many more puzzles offline, verify them, compress a collection of good
variants, and let a tiny seed choose between them.

That could make URLs such as `?s=4821` represent shareable
constellations while preserving the same guarantee: every shipped puzzle
has already been verified.

After that, I would consider a small completion animation and more
sophisticated hint deductions.

But neither is worth compromising the reliability of the 13KB version.

## 19. What I learned

### Random generation is not puzzle generation

Generating valid-looking input is easy. Generating something uniquely
solvable and enjoyable is a different problem.

### Topology can be gameplay

The cube started as the visual premise. It became the mathematical
mechanism.

### Local ambiguity can be desirable

Normally ambiguity sounds like a puzzle-generation failure. UNICUBE
intentionally allows individual faces to remain ambiguous because
neighboring faces provide the missing information.

### Offline computation is a form of compression

The browser does not need to know how difficult it was to find a puzzle.
It only needs the result.

### Size limits reward architecture

The biggest savings did not initially come from shaving characters. They
came from deciding what **should not exist at runtime at all**.

### Test the thing you actually submit

The production-only startup bug appeared after the game had already
passed its source regression suite.

The ZIP is the product.

## 20. Final numbers

At the current release-candidate stage:

  Metric                                       Value
  ----------------------------------- --------------
  JS13K limit                           13,312 bytes
  Current submission ZIP                12,634 bytes
  Remaining headroom                       678 bytes
  7×7 face references                            294
  7×7 physical cube cells                        218
  Random region maps tested                   10,000
  Unique random face maps                      0.12%
  5×5 independent face combinations               48
  5×5 global cube solutions                        1

And, eventually, one unicorn per row, column, and rainbow.

## Epilogue

UNICUBE began with a fairly silly question:

> Can I put unicorns on a rainbow cube?

The answer required considerably more constraint solving than expected.

The part I'm happiest with is that the final game doesn't need to
explain most of that machinery.

You can rotate the cube, extinguish a star, notice something change
around an edge, and place a unicorn.

The mathematics happened so that moment could feel simple.

**Six faces. Shared stars. One solution.**
