import {topology} from '../experiments/cube-topology/topology.mjs';
import {createPlayer, UNICORN, EXCLUDED} from './player.mjs';
import {createRenderer} from './renderer3d.mjs';
import {celestialState} from './celestial-input.mjs';

// A sparse, deterministic partial placement from Board C's verified truth.
// These are canonical IDs, never separate marks for each face representation.
export const previewUnicorns = ['6,2,6', '1,6,6', '2,4,6', '6,5,5', '2,6,3', '0,6,0'];
export function createPreviewPlayer(board) {
  const player = createPlayer(board.maps, topology);
  for (const id of previewUnicorns) {
    if (!board.truth.includes(id)) throw Error(`Preview unicorn is not in truth: ${id}`);
    player.set(id, UNICORN);
  }
  // Scatter dim stars on every face, excluding only known empty locations.
  const truth = new Set(board.truth);
  topology.physicalCells.forEach((cell, i) => {
    if (i % 7 === 2 && !truth.has(cell.id)) player.set(cell.id, EXCLUDED);
  });
  return player;
}

export async function startCubePreview() {
  const $ = id => document.getElementById(id);
  document.body.classList.remove('dev-mode');
  document.body.classList.add('celestial', 'cube-preview');
  document.title = 'UNICUBE · Celestial cube';
  document.querySelector('.celestial-title').textContent = 'CELESTIAL CUBE';
  $('status').textContent = 'drag to rotate';
  $('net-scroll').hidden = true;
  const response = await fetch('/experiments/rainbow-cube/examples.json');
  if (!response.ok) throw Error('Could not load saved cube fixture');
  const board = (await response.json()).C;
  const player = createPreviewPlayer(board);
  const renderer = createRenderer($('cube'), {
    topology, maps: board.maps, player, activeFaces: topology.faces,
    celestial: true, cubePreview: true, overlay: $('emoji-overlay'),
    onPick: (id, button, action) => player.set(id, celestialState(player.get(id), action)),
    onError: error => { $('status').textContent = error; }
  });
  window.addEventListener('pagehide', () => renderer.dispose(), {once:true});
  return {player, renderer};
}
