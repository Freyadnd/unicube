# Project guidance

UNICUBE is an early-stage JS13K spatial logic puzzle experiment themed around Unicorns and Rainbows.

## Priorities

- **Tiny bundle size:** treat the eventual JS13K size limit as a core constraint. Avoid unnecessary dependencies and frameworks; distinguish development tooling from shipped runtime code.
- **Vanilla JavaScript:** prefer small, clear JavaScript modules and browser APIs where possible.
- **Procedural assets:** favor generated visuals and audio over large external assets.
- **Deterministic puzzle generation:** use explicit seeds and reproducible algorithms when generation is introduced. Record relevant parameters in experiments.
- **Mathematical correctness:** define topology, shared-cell identity, region scope, and uniqueness precisely. Validate hypotheses rather than treating them as established rules.
- **Tests for puzzle constraints:** when implementing puzzle logic, test row, column, region, and shared-cell constraints, satisfiability, uniqueness, and deterministic behavior. Include invalid cases and edge/corner cases.

## Current scope

The currently authorized scope includes documentation and the development-only single-face solver, connected region generator, tests, and measurements. Keep cube-level questions unresolved. Do not implement gameplay, WebGL, rendering, or cube topology unless a subsequent task requests it.

Experiment 3A additionally authorizes development-only cube coordinate topology,
geometrically derived shared-cell/edge/corner mappings, exhaustive topology
tests, and text debug output in `experiments/cube-topology/`. This authorization
does not include cube puzzle constraints or generation, rendering, gameplay,
UI, or assets. Keep puzzle-level cube questions unresolved.

Step 4 authorizes global complete unicorn placements over the fixed 3A topology,
with exactly one per face row and column, validation, deterministic search,
measurements and text answer nets in `experiments/complete-cube/`. It does not
authorize rainbow regions, player clues, player-puzzle generation or gameplay.

Step 5 additionally authorizes development-only rainbow board construction in
`experiments/rainbow-cube/`, using saved Step 4 answers, seven connected regions
per face, global counting over shared cells, deterministic region edits, tests,
and text region/answer nets. Region constraints remain face-local even when
color labels agree across edges. No revealed clues, global regions, rendering,
UI or gameplay are authorized.

Step 8 authorizes a development-only vanilla WebGL vertical slice in `src/`,
using Board C and the existing topology/player logic. It does not authorize
changing puzzle rules, adding levels, 3D frameworks, final progression, sound,
or 13KB optimization.

Keep mathematical experiments in `experiments/`, rule definitions and open questions in `docs/`, and eventual game runtime code in `src/`. Keep `src/` empty apart from its directory placeholder during this phase.

Before future implementation, read `README.md` and `docs/rules.md`. Document any chosen interpretation of unresolved rules, and keep experimental dependencies out of the game bundle.
