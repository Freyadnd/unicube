import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {solve,validateMap} from '../experiments/single-face/model.mjs';
import {topology as t} from '../experiments/cube-topology/topology.mjs';
const levels=JSON.parse(fs.readFileSync(new URL('../experiments/tutorial-levels/examples.json',import.meta.url)));
test('saved tutorial fixtures are fresh unique single-face puzzles',()=>{assert.equal(levels.length,5);for(const l of levels.slice(0,2)){validateMap(l.maps.front);assert.equal(solve(l.maps.front).length,1);const p=solve(l.maps.front)[0];assert.deepEqual(l.truth,p.map((c,r)=>t.faceCellToPhysical('front',r,c)));assert.deepEqual(l.fixed,[]);}});
