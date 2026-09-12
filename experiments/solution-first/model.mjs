import {neighbors, validateMap} from '../single-face/model.mjs';

export function generate(rng, variant, n = 7, maxAttempts = 100000) {
  if (!['A', 'B', 'C'].includes(variant)) throw new Error('Unknown variant');
  if (!Number.isInteger(n) || n < 1 || (variant === 'B' && n === 1)) throw new Error('Invalid size');
  for (let attempts = 1; attempts <= maxAttempts; attempts++) {
    const planted = Array.from({length:n}, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [planted[i], planted[j]] = [planted[j], planted[i]];
    }
    const map = Array(n*n).fill(-1), sizes = Array(n).fill(1);
    planted.forEach((c,r) => { map[r*n+c] = r; });
    for (let step = n; step < n*n; step++) {
      const frontier = [];
      for (let i = 0; i < n*n; i++) if (map[i] >= 0)
        for (const j of neighbors(i,n)) if (map[j] < 0) {
          const region = map[i];
          // Soft inverse-square size weight per directed frontier contact.
          frontier.push({cell:j, region, weight:variant === 'C' ? 1 / sizes[region]**2 : 1});
        }
      let ticket = rng() * frontier.reduce((s,e) => s+e.weight,0);
      let chosen = frontier.at(-1);
      for (const edge of frontier) { ticket -= edge.weight; if (ticket < 0) { chosen = edge; break; } }
      map[chosen.cell] = chosen.region; sizes[chosen.region]++;
    }
    if (variant === 'B' && sizes.includes(1)) continue;
    return {map, planted, sizes, attempts, growthSteps:attempts*(n*n-n)};
  }
  throw new Error('Rejection attempt limit reached');
}

export const boundary = (i,n=7) => Math.floor(i/n) === 0 || Math.floor(i/n) === n-1 || i%n === 0 || i%n === n-1;
export const occupied = (p,i,n=7) => p[Math.floor(i/n)] === i%n;

// Exact distinguishing-set search over rival-solution bit masks, NOT human deduction.
export function distinguish(solutions, truthIndex, cells, n=7) {
  if (solutions.length > 10 || !solutions.length) throw new Error('Expected 1–10 solutions');
  const truth = solutions[truthIndex];
  if (!truth) throw new Error('Invalid truth');
  const rivals = solutions.filter((_,i) => i !== truthIndex);
  const full = (1 << rivals.length)-1;
  const masks = cells.map(cell => ({cell, mask:rivals.reduce((m,p,k) =>
    m | (occupied(p,cell,n) !== occupied(truth,cell,n) ? 1<<k : 0),0)}));
  const dp = Array(full+1).fill(null); dp[0] = [];
  for (const {cell,mask} of masks) {
    if (!mask) continue;
    const old = dp.slice();
    for (let m=0;m<=full;m++) if (old[m] !== null) {
      const next = m|mask, witness = [...old[m],cell];
      if (dp[next] === null || witness.length < dp[next].length) dp[next] = witness;
    }
  }
  return {minimum:dp[full]?.length ?? null, witness:dp[full],
    decisive:masks.filter(x => x.mask === full && full !== 0).map(x => x.cell)};
}

// Only unit singles and elimination from established unicorns; no solution oracle.
export function deduce(map, clues=[], n=7) {
  validateMap(map,n);
  const state = Array(n*n).fill(-1), trace = [];
  const units = ['row','column','region'].flatMap(kind => Array.from({length:n},(_,id) => ({kind,id,
    cells:Array.from({length:n*n},(_,i)=>i).filter(i =>
      (kind === 'row' ? Math.floor(i/n) : kind === 'column' ? i%n : map[i]) === id)})));
  function set(cell,value,reason) {
    if (state[cell] === value) return false;
    if (state[cell] !== -1) throw new Error('Contradictory facts');
    state[cell] = value; trace.push({cell,value,...reason}); return true;
  }
  for (const {cell,value} of clues) {
    if (!Number.isInteger(cell) || cell<0 || cell>=n*n || ![0,1].includes(value)) throw new Error('Invalid clue');
    set(cell,value,{rule:'given'});
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const {kind,id,cells} of units) {
      const filled = cells.filter(i=>state[i]===1), remaining = cells.filter(i=>state[i]!==0);
      if (filled.length>1 || !remaining.length) throw new Error('Contradictory unit');
      if (filled.length === 1) {
        for (const cell of cells) if (cell !== filled[0]) changed = set(cell,0,{rule:`${kind} elimination`,unit:id,source:filled[0]}) || changed;
      } else if (remaining.length === 1) changed = set(remaining[0],1,{rule:'forced remaining cell',kind,unit:id}) || changed;
    }
  }
  return {state,trace,unicorns:state.filter(v=>v===1).length,unknown:state.filter(v=>v===-1).length,
    solved:state.every(v=>v!==-1)};
}

export function analyze(map, solutions, planted, n=7) {
  const cells = Array.from({length:n*n},(_,i)=>i), edge = cells.filter(i=>boundary(i,n));
  const differing = cells.filter(i=>solutions.some(p=>occupied(p,i,n)!==occupied(solutions[0],i,n)));
  const rows = [...new Set(differing.map(i=>Math.floor(i/n)))], columns = [...new Set(differing.map(i=>i%n))];
  const truths = solutions.map((_,index)=>({all:distinguish(solutions,index,cells,n),edge:distinguish(solutions,index,edge,n)}));
  const plantedIndex = solutions.findIndex(p=>p.every((c,r)=>c===planted[r]));
  if (plantedIndex<0) throw new Error('Planted solution missing');
  const deduction = deduce(map,[],n);
  const witness = truths[plantedIndex].edge.witness;
  const afterEdge = witness === null ? null : deduce(map,witness.map(cell=>({cell,value:+occupied(planted,cell,n)})),n);
  return {differing,rows,columns,boundaryDiffering:differing.filter(i=>boundary(i,n)),
    shape:solutions.length===2 && differing.length===4 && rows.length===2 && columns.length===2 ? 'two-row swap' :
      rows.length<=3 && columns.length<=3 ? 'localized (at most 3 rows and columns)' : 'distributed',
    plantedIndex,truths,deduction,afterEdge};
}
