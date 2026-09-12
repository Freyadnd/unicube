import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generateMap, random, solve, isUnique, validateMap, validatePlacement, permutations} from './model.mjs';

// Independent oracle: choose arbitrary n-cell subsets of all n*n cells.
// No permutation representation or production validator is used.
function bruteForce(map, n) {
  const result = [];
  function visit(cells, start) {
    if (cells.length === n) {
      const rows = Array(n).fill(0), cols = Array(n).fill(0), regions = Array(n).fill(0);
      for (const i of cells) { rows[Math.floor(i / n)]++; cols[i % n]++; regions[map[i]]++; }
      if ([...rows, ...cols, ...regions].every(x => x === 1))
        result.push(cells.map(i => i % n));
      return;
    }
    for (let i = start; i <= n * n - (n - cells.length); i++) visit([...cells, i], i + 1);
  }
  visit([], 0);
  return result;
}

test('independent subset brute force: all connected labeled 2x2 maps; 100 3x3 and 30 4x4 maps', () => {
  for (let bits = 0; bits < 16; bits++) {
    const map = Array.from({length: 4}, (_, i) => (bits >>> i) & 1);
    try { validateMap(map, 2); } catch { continue; }
    assert.deepEqual(solve(map, 2), bruteForce(map, 2));
  }
  const rng = random(12345);
  for (const [n, count] of [[3, 100], [4, 30]]) for (let k = 0; k < count; k++) {
    const map = generateMap(rng, n);
    assert.deepEqual(solve(map, n), bruteForce(map, n));
  }
});

test('7x7 independent region-first cell search agrees on 20 maps', () => {
  const rng = random(6789);
  for (let k = 0; k < 20; k++) {
    const map = generateMap(rng), answers = [];
    function visit(region, cells) {
      if (region === 7) {
        answers.push(cells.toSorted((a,b) => a-b).map(i => i % 7).join(','));
        return;
      }
      for (let i = 0; i < 49; i++) if (map[i] === region && cells.every(j =>
        Math.floor(i / 7) !== Math.floor(j / 7) && i % 7 !== j % 7)) visit(region + 1, [...cells, i]);
    }
    visit(0, []);
    assert.deepEqual(solve(map).map(x => x.join(',')).sort(), answers.sort());
  }
});

test('known extremes, uniqueness, placement rejection and map validation', () => {
  const stripes = Array.from({length: 49}, (_, i) => Math.floor(i / 7));
  assert.equal(permutations().length, 5040);
  assert.equal(solve(stripes).length, 5040);
  assert.equal(isUnique(stripes), false);
  assert.equal(validatePlacement(stripes, [0,1,2,3,4,5,6]), true);
  for (const bad of [[0,0,2,3,4,5,6], [0,1], [0,1,2,3,4,5,7], [0,1,2,3,4,5,1.5]])
    assert.equal(validatePlacement(stripes, bad), false);
  const impossible = Array(49).fill(6);
  for (let i = 0; i < 6; i++) impossible[i] = i;
  assert.equal(solve(impossible).length, 0);
  assert.equal(validatePlacement(impossible, [0,1,2,3,4,5,6]), false);
  assert.equal(isUnique([0,0,0,1], 2), true);
  for (const bad of [[], Array(49).fill(0), [...stripes.slice(1), 7]]) assert.throws(() => validateMap(bad));
  assert.throws(() => validateMap([0,1,1,0], 2), /connected/);
});

test('generator coverage, connectivity and reproducibility for 1000 maps', () => {
  const a = random(42), b = random(42);
  for (let i = 0; i < 1000; i++) {
    const map = generateMap(a);
    assert.deepEqual(map, generateMap(b));
    assert.equal(validateMap(map), true);
  }
});

test('saved representative boards reproduce complete solution sets', () => {
  const examples = JSON.parse(readFileSync(new URL('./examples.json', import.meta.url)));
  for (const example of Object.values(examples)) {
    assert.deepEqual(solve(example.map), example.solutions);
    assert.equal(example.solutions.length, example.count);
    assert.equal(isUnique(example.map), example.count === 1);
    for (const placement of example.solutions) assert.equal(validatePlacement(example.map, placement), true);
  }
});
