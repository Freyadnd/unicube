// Shared lightweight region validation. No search or generation code.
export function neighbors(i, n) {
  return [i % n ? i - 1 : -1, i % n < n - 1 ? i + 1 : -1,
    i >= n ? i - n : -1, i < n * (n - 1) ? i + n : -1].filter(j => j >= 0);
}

export function validateMap(map, n = 7, connected = true) {
  if (!Number.isInteger(n) || n < 1 || !Array.isArray(map) || map.length !== n * n)
    throw new Error(`Expected ${n*n} cells for n=${n}, got ${map?.length ?? 'non-array'}`);
  if (map.some(x => !Number.isInteger(x) || x < 0 || x >= n))
    throw new Error('Region IDs must be integers 0..n-1');
  for (let region = 0; region < n; region++) {
    const cells = map.flatMap((x, i) => x === region ? [i] : []);
    if (!cells.length) throw new Error('Every region must be nonempty');
    if (connected) {
      const seen = new Set([cells[0]]), queue = [cells[0]];
      for (const i of queue) for (const j of neighbors(i, n)) {
        if (map[j] === region && !seen.has(j)) { seen.add(j); queue.push(j); }
      }
      if (seen.size !== cells.length) throw new Error('Regions must be orthogonally connected');
    }
  }
  return true;
}

