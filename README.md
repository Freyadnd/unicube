# UNICUBE

An experimental JS13K project exploring a 3D spatial logic puzzle themed around **Unicorns and Rainbows**.

This repository contains a puzzle hypothesis, completed single-face experiments,
and a development-only cube surface topology study. There is no game
implementation, renderer, or build system yet.

## Puzzle hypothesis

- The puzzle takes place on the surface of a cube.
- Each of the six faces conceptually contains a 7×7 grid.
- Each face sees exactly seven unicorns: exactly one in each row and exactly one in each column.
- Rainbow-colored regions partition the surface. Each relevant region contains exactly one unicorn.
- Cells along cube edges may be shared by two faces; corner cells may potentially be shared by three.
- Rainbow regions may eventually cross cube edges.
- Ideally, the full puzzle has a unique solution, while individual faces remain ambiguous without information from their neighbors.

These are proposed constraints, not settled rules. In particular, cell sharing, region scope, and the meaning of face-local ambiguity need precise definitions before implementation. See [rules and open questions](docs/rules.md).

## Structure

- `docs/rules.md` — assumptions, unresolved questions, and mathematical validation targets.
- `experiments/` — mathematical models, solvers, and constraint experiments. See the [single-face findings](experiments/results-single-face.md) for reproduction commands and measured results.
- `src/` — reserved for the eventual browser game; currently empty except for a directory placeholder.
- `experiments/cube-topology/` — geometric face frames, shared-cell mappings,
  exhaustive topology tests, and a text cube net. See the
  [Experiment 3A findings](experiments/results-cube-topology.md).
- `AGENTS.md` — development priorities and scope guardrails.
- `experiments/complete-cube/` — global complete-placement search, validation,
  measurements and answer nets; see [Step 4 results](experiments/results-complete-cube.md).
- `experiments/rainbow-cube/` — constructed face-local rainbow boards, global
  solution counting, and verified no-clue examples; see
  [Step 5 findings](experiments/results-rainbow-cube.md).

## Approach

The design target is deliberately ambiguous individual faces and a uniquely
solvable global puzzle: `solutions(face) > 1`, `solutions(global cube) = 1`.
Single-face uniqueness is a measurement, not the generation objective.
Experiment 2 investigates solution-first generation and whether small local
ambiguity can be resolved by hypothetical boundary-cell information.
See the [solution-first results](experiments/results-solution-first.md), including
generator comparisons, boundary-clue measurements, and saved examples.

Establish a consistent model and verify its constraints before building gameplay. Keep experiments lightweight and separate from runtime code. The eventual browser game must fit the JS13K size limit, so favor vanilla JavaScript, procedural assets, and minimal tooling.
