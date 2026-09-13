import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {topology} from '../experiments/cube-topology/topology.mjs';
import {solve} from '../experiments/single-face/model.mjs';
import {countGlobal,countByFaces,validateBoard} from '../experiments/rainbow-cube/model.mjs';
import {analyzeConstellation,quality} from '../experiments/directors-cut/analysis.mjs';
import {resolveConstellation,nextConstellation,validateBank} from '../directors/bank.mjs';
import {createPlayer} from '../src/player.mjs';

const data=JSON.parse(readFileSync(new URL('../directors/constellations.json',import.meta.url)));
const bank=data.constellations;

test('verified Director bank contains twelve distinct, globally unique 7×7 constellations',()=>{
  assert.equal(data.formatVersion,1);assert.equal(data.searchSeed,20260913);assert.equal(bank.length,12);
  validateBank(bank);assert.equal(new Set(bank.map(x=>x.provenance.partitionHash)).size,bank.length);
  assert.equal(new Set(bank.map(x=>x.provenance.source)).size,2);
  for(const item of bank){
    assert.equal(item.fixed.length,0);assert.ok(topology.faces.includes(item.startFace));
    validateBoard(item.maps,item.truth);
    const result=countGlobal(item.maps,{required:item.fixed});
    assert.equal(result.exact,true,item.id);assert.equal(result.count,1,item.id);
    assert.deepEqual(result.solutions[0],item.truth.slice().sort(),item.id);
    const local=topology.faces.map(face=>solve(item.maps[face]).length);
    assert.deepEqual(local,item.metadata.localSolutionCounts,item.id);
    assert.ok(local.every(n=>n>1),item.id);
    assert.equal(local.reduce((x,n)=>x*BigInt(n),1n).toString(),item.metadata.independentLocalCombinationCount);
    assert.deepEqual(analyzeConstellation(item),item.metadata,item.id);
    assert.equal(quality(item.metadata).accepted,true,item.id);
    const player=createPlayer(item.maps,topology,item.fixed,topology.faces);
    for(const id of item.truth)player.set(id,2);
    assert.equal(player.evaluate().solved,true,item.id);
  }
  assert.equal(countByFaces(bank[0].maps).count,1,'independent face-domain oracle');
});

test('URL ID selects a saved fixture exactly and New cycles without reinterpreting IDs',()=>{
  assert.equal(resolveConstellation(bank,`?s=${bank[4].id}`).id,bank[4].id);
  assert.equal(resolveConstellation(bank,'?s=unknown').id,bank[0].id);
  assert.equal(nextConstellation(bank,bank.at(-1)).id,bank[0].id);
  for(let i=0;i<bank.length-1;i++)assert.equal(nextConstellation(bank,bank[i]).id,bank[i+1].id);
});
