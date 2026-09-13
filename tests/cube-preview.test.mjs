import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {topology} from '../experiments/cube-topology/topology.mjs';
import {createPreviewPlayer, previewUnicorns} from '../src/cube-preview.mjs';
import {celestialState} from '../src/celestial-input.mjs';

const board = JSON.parse(readFileSync(new URL('../experiments/rainbow-cube/examples.json', import.meta.url))).C;
test('cube preview uses valid sparse truth, dim empty stars, and canonical seams', () => {
  const player = createPreviewPlayer(board);
  assert.equal(topology.n, 7);
  assert.equal(topology.physicalCells.length, 218);
  assert.deepEqual(player.marks().required.sort(), [...previewUnicorns].sort());
  assert.ok(player.marks().excluded.length > 0);
  assert.ok(player.marks().excluded.every(id => !board.truth.includes(id)));
  assert.deepEqual(player.evaluate().contradictions, []);
  assert.equal(player.evaluate().solved, false);
  for (const id of ['6,2,6', '0,6,0']) {
    const refs = topology.physicalToFaceCells(id);
    assert.equal(refs.length, id === '6,2,6' ? 2 : 3);
    for (const ref of refs) assert.equal(player.get(topology.faceCellToPhysical(ref.face,ref.row,ref.col)), 2);
    player.set(id, celestialState(player.get(id), 'double'));
    for (const ref of refs) assert.equal(player.get(topology.faceCellToPhysical(ref.face,ref.row,ref.col)), 0);
  }
});
