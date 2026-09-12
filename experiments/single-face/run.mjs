import {performance} from 'node:perf_hooks';
import {writeFileSync} from 'node:fs';
import os from 'node:os';
import {generateMap, random, solve, permutations, validatePlacement} from './model.mjs';

const seed = 20260912, sampleSize = 10000, rng = random(seed);
const start = performance.now();
permutations();
const setupMs = performance.now() - start;
const counts = {}, sizes = {}, rankedSizes = Array.from({length: 7}, () => ({}));
const categories = {zero: 0, unique: 0, multiple: 0};
const bySingleton = {with: {maps: 0, unique: 0, zero: 0}, without: {maps: 0, unique: 0, zero: 0}};
const records = [], examples = {};
let generationMs = 0, solvingMs = 0;
for (let index = 0; index < sampleSize; index++) {
  let t = performance.now();
  const map = generateMap(rng);
  generationMs += performance.now() - t;
  t = performance.now();
  const solutions = solve(map);
  solvingMs += performance.now() - t;
  const count = solutions.length, regionSizes = Array(7).fill(0);
  for (const id of map) regionSizes[id]++;
  const category = count === 0 ? 'zero' : count === 1 ? 'unique' : 'multiple';
  categories[category]++;
  counts[count] = (counts[count] ?? 0) + 1;
  for (const size of regionSizes) sizes[size] = (sizes[size] ?? 0) + 1;
  regionSizes.toSorted((a,b) => a-b).forEach((size, rank) => rankedSizes[rank][size] = (rankedSizes[rank][size] ?? 0) + 1);
  const group = bySingleton[regionSizes.includes(1) ? 'with' : 'without'];
  group.maps++; group.unique += count === 1; group.zero += count === 0;
  records.push({index, count, regionSizes});
  const example = {index, map, count, regionSizes, solutions};
  if (count === 1 && !examples.unique) examples.unique = example;
  if (count > 1 && (!examples.low || count < examples.low.count)) examples.low = example;
  if (!examples.high || count > examples.high.count) examples.high = example;
}
for (const example of Object.values(examples)) for (const p of example.solutions)
  if (!validatePlacement(example.map, p)) throw new Error('Invalid saved solution');
const output = {parameters: {seed, sampleSize, n: 7, generator: 'uniform directed frontier edge growth',
  prng: 'Mulberry32', replacement: true, symmetry: 'fixed coordinates; no symmetry reduction'},
  environment: {node: process.version, platform: os.platform(), arch: os.arch(), cpu: os.cpus()[0].model},
  categories, counts, sizes, rankedSizes, bySingleton,
  timings: {setupMs, generationMs, solvingMs, totalComputeMs: performance.now() - start}, records};
writeFileSync(new URL('./results.json', import.meta.url), JSON.stringify(output, null, 2) + '\n');
writeFileSync(new URL('./examples.json', import.meta.url), JSON.stringify(examples, null, 2) + '\n');
console.log(JSON.stringify({...output, records: undefined, rankedSizes: undefined}, null, 2));
