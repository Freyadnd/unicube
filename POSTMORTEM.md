# UNICUBE --- Postmortem

**Six faces. Shared stars. One solution.**

UNICUBE is a spatial logic puzzle I made for JS13K 2026. The competition
build is 12,654 bytes zipped.

There is also a larger **Director's Cut** that skips the tutorial
campaign and goes straight to 7×7 constellations:

**Director's Cut:** https://unicube-directors-cut.vercel.app/

The basic rule is simple: on every face of the cube, place exactly one
🦄 in each row, each column, and each rainbow region.

The catch is that the six faces are not separate boards. Edge cells
belong to two faces, and corner cells belong to three. So a cell that
looks ambiguous from one side can become forced after you rotate the
cube.

That shared geometry ended up being the whole game.

## Where it started

The first version was much less interesting: essentially six
Queens-style region puzzles displayed on a cube.

I wanted the cube to matter mathematically, not just visually, so I
changed the model. Every location on the surface became a canonical
physical cell. A face only holds a reference to it.

For a 7×7 cube there are 294 visible face-cell references, but only 218
physical cells:

`6(N - 2)^2 + 12(N - 2) + 8`

For N = 7:

`150 face interiors + 60 edge interiors + 8 corners = 218`

An interior cell appears once, an edge cell twice, and a corner three
times:

`150 × 1 + 60 × 2 + 8 × 3 = 294`

This means placing or ruling out a unicorn on an edge immediately
changes the neighboring face too.

Rainbow regions are different: they stay local to each face. So one
physical cell can participate in several different row, column, and
region constraints depending on which faces touch it.

## Random regions did not work

My first attempt at puzzle generation was simply to make random
connected rainbow regions and count the solutions.

I tested 10,000 random 7×7 face maps:

  Result                    Share
  ---------------------- --------
  No solution              52.72%
  Exactly one solution      0.12%
  Multiple solutions       47.16%

The average map had about 32.29 solutions.

So random regions were basically useless as a puzzle generator. Most
were impossible or very ambiguous, and unique boards were extremely
rare.

From there I switched to a solution-first approach: construct valid cube
states, build regions around them, and use an offline solver to reject
anything that does not have the properties I want.

## Local ambiguity, global uniqueness

This became the main idea behind UNICUBE.

A face does **not** need to have one solution by itself. In fact, it is
more interesting when it doesn't.

The offline tooling counts solutions for every individual face and then
counts solutions again with all shared edge and corner identities
connected.

One of the 5×5 puzzles in the competition build has 48 possible
combinations if its six faces are treated independently.

As one shared cube, it has exactly one.

`48 local combinations → 1 global solution`

That was the point where the cube stopped being a presentation trick and
became the actual puzzle mechanic.

The Director's Cut pushes this much further. Its current verified 7×7
bank contains 12 different region puzzles, all with exactly one global
solution and no fixed unicorns.

For example, constellation `#10257` has isolated face solution counts:

`48 × 16 × 68 × 24 × 48 × 6`

That is **360,972,288** independent local combinations.

Once the faces share their physical edge and corner cells, there is
**1** global solution.

You can open that exact saved constellation with:

https://unicube-directors-cut.vercel.app/?s=10257

The `?s=` value currently selects a puzzle from a finite
offline-verified bank. It is deterministic, but it is not pretending to
be a procedural generator.

## Why the solver is offline

I considered generating puzzles from random seeds in the browser, but
uniqueness alone is not enough. A puzzle can be mathematically valid and
still be boring, opaque, or unpleasant to solve.

For the 13KB version, shipping the generator and global solver would
also have been a terrible use of bytes.

So the expensive work happens before the game ships:

1.  generate candidates;
2.  solve individual faces;
3.  solve the connected cube;
4.  reject non-unique cubes;
5.  measure local ambiguity and other structural properties;
6.  save only verified fixtures.

The runtime only needs the result.

The competition build contains no general-purpose puzzle generator or
global solver.

## Turning it into a game

The first playable prototype went straight to 7×7. It made sense to me
because I had been staring at the rules for hours. It did not make much
sense as an introduction.

The competition version became a four-act progression:

`3×3 → 4×4 → 5×5 → 7×7`

The 3×3 puzzle is heavily guided. It teaches rows, columns, rainbow
regions, shared edges, and shared corners through actual moves rather
than a long rules screen.

By 7×7, the tutorial is gone and the player is solving the full cube.

The Director's Cut removes that progression and opens directly on 7×7.
It is the version for experimenting with the larger puzzle system rather
than teaching it.

## Interaction and visual language

I wanted the board to feel less like a spreadsheet, so the cell states
became:

-   `✦` possible
-   `·` ruled out
-   `🦄` confirmed

Clicking a star extinguishes it into a dot. Double-clicking places a
unicorn. Dragging rotates the cube.

The renderer is small custom WebGL, with CSS and system text around it.
There are no external textures, fonts, image assets, or 3D libraries in
the competition build. The unicorn itself is the native Unicode emoji.

The face indicators under the cube do several jobs at once: they show
progress, help with orientation, and rotate a selected face toward the
camera.

Hints also avoid looking at the known solution. They only use deductions
available from the player's current state.

## Fitting it into 13KB

The development repo is much larger than the game because it contains
the experiments, solvers, generators, fixtures, analysis, and tests.

The submission does not.

An early stripped build was only 8,722 bytes, but it was missing much of
the final game. After adding the campaign, tutorial, hints, navigation,
camera behavior, and final visuals, the release pipeline packed
everything back into a single HTML file.

Final competition archive:

  Metric                  Value
  -------------- --------------
  JS13K limit      13,312 bytes
  Final ZIP        12,654 bytes
  Headroom            658 bytes
  Source tests            70/70

The ZIP contains only `index.html` at its root.

One useful lesson from the last release pass: test the artifact, not
just the source.

The source tests were already green when the packed production build
exposed a startup bug caused by transformed level data. Later browser QA
found another release issue where the cube clipped on narrow screens.

The final archive was tested directly in Chrome across all four acts,
including mouse, drag, touch, Undo, Reset, Hint, Rules, face navigation,
desktop, and portrait layouts.

## Director's Cut

Once the 13KB build was frozen, I branched the project and stopped
treating size as the main constraint.

The Director's Cut currently:

-   opens directly on 7×7;
-   contains 12 offline-verified constellations;
-   gives each constellation a stable ID;
-   supports shareable `?s=` URLs;
-   shows the real local/global solution counts for each puzzle;
-   keeps the same cube renderer and interaction model.

The first search for this bank examined 300 assemblies, refined 13
candidates, and accepted 12 in 4.49 seconds.

The current filters require exactly one global solution, locally
ambiguous faces, substantial independent local ambiguity, connected
regions, and evidence that shared boundaries actually remove
possibilities.

The obvious next problem is no longer uniqueness. It is human solve
quality.

Some globally unique 7×7 boards do not immediately expose a deduction
through the game's simple hint vocabulary. So the next version of the
generator needs to care about the *path* to the solution, not just the
fact that one exists.

That is also why I have not called the current Director's Cut an
infinite procedural generator. It is a small verified bank that can keep
growing as the generation and difficulty model improves.

## What I learned

The biggest surprise was that ambiguity was useful.

Normally, multiple solutions are something a puzzle generator tries to
eliminate. Here I want ambiguity on individual faces. The interesting
part is watching those possibilities disappear when the faces are
connected.

The second lesson was that offline computation is a very good form of
compression. The browser does not need to know how a puzzle was found.
It only needs enough information to let someone solve it.

And the 13KB limit mostly rewarded removing whole ideas from runtime,
not shaving individual characters. The solver, generator, research code,
and verification machinery can be as elaborate as they need to be as
long as the shipped game only carries their output.

UNICUBE started as "what if I put a unicorn puzzle on a cube?"

The version I ended up liking is slightly different:

**What if each face is incomplete on purpose, and the cube itself is the
missing information?**
