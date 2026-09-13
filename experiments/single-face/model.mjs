// Development-only model. A map is a row-major array of n*n region IDs 0..n-1.
// A placement is n zero-based column indices, one for each row.
import {neighbors,validateMap} from '../../src/region-map.mjs';
export {neighbors,validateMap};

export function validatePlacement(map, columns, n = 7) {
  validateMap(map, n);
  if (!Array.isArray(columns) || columns.length !== n ||
      columns.some(c => !Number.isInteger(c) || c < 0 || c >= n)) return false;
  return new Set(columns).size === n &&
    new Set(columns.map((c, r) => map[r * n + c])).size === n;
}

const cache = new Map();
export function permutations(n = 7) {
  if (!cache.has(n)) {
    const result = [];
    function visit(prefix, remaining) {
      if (!remaining.length) result.push(Object.freeze(prefix));
      for (const c of remaining) visit([...prefix, c], remaining.filter(x => x !== c));
    }
    visit([], Array.from({length: n}, (_, i) => i));
    cache.set(n, Object.freeze(result));
  }
  return cache.get(n);
}

export function solve(map, n = 7) {
  validateMap(map, n);
  return permutations(n).filter(columns => {
    const seen = new Set();
    for (let r = 0; r < n; r++) {
      const region = map[r * n + columns[r]];
      if (seen.has(region)) return false;
      seen.add(region);
    }
    return true;
  });
}

export function isUnique(map, n = 7) { return solve(map, n).length === 1; }

// Mulberry32: reproducible non-cryptographic 32-bit PRNG.
export function random(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = Math.imul(state ^ state >>> 15, state | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function generateMap(rng, n = 7) {
  const map = Array(n * n).fill(-1);
  const available = Array.from({length: n * n}, (_, i) => i);
  // Uniform distinct seed cells, labeled in selection order.
  for (let region = 0; region < n; region++) {
    const k = Math.floor(rng() * available.length);
    map[available.splice(k, 1)[0]] = region;
  }
  // Uniform choice among directed occupied-to-empty grid edges each step.
  // This favors regions with larger frontiers; it is NOT uniform over partitions.
  for (let remaining = n * n - n; remaining; remaining--) {
    const frontier = [];
    for (let i = 0; i < map.length; i++) if (map[i] >= 0)
      for (const j of neighbors(i, n)) if (map[j] === -1) frontier.push([j, map[i]]);
    const [cell, region] = frontier[Math.floor(rng() * frontier.length)];
    map[cell] = region;
  }
  return map;
}

export const formatMap = map => Array.from({length: 7}, (_, r) =>
  map.slice(r * 7, r * 7 + 7).map(x => 'ABCDEFG'[x]).join(' ')).join('\n');
