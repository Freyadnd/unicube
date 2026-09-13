// One transition per physical identity, shared by all visible representations.
// Amount 0 is a complete star; amount 1 is only a dusty remnant.
export function createStarTransition() {
  const cells = new Map();
  return (id, state, now) => {
    const target = state === 1 ? 1 : 0;
    let cell = cells.get(id);
    if (!cell) {
      cell = {from:target, to:target, start:now};
      cells.set(id, cell);
    }
    const sample = () => {
      const t = Math.min(1, Math.max(0, (now-cell.start)/150));
      return cell.from + (cell.to-cell.from)*t*t*(3-2*t);
    };
    const current = sample();
    if (target !== cell.to) Object.assign(cell, {from:current, to:target, start:now});
    // A double tap immediately supersedes any exclusion animation.
    if (state === 2) Object.assign(cell, {from:0, to:0, start:now});
    return state === 2 ? 0 : sample();
  };
}
