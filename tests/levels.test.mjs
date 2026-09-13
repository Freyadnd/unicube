import test from 'node:test';import assert from 'node:assert/strict';
import {topology as t} from '../experiments/cube-topology/topology.mjs';
import {countGlobal} from '../experiments/rainbow-cube/model.mjs';
import fixtures from '../experiments/rainbow-cube/examples.json' with {type:'json'};
import {createPlayer,UNICORN} from '../src/player.mjs';
import {makeLevels,createProgress} from '../src/levels.mjs';import tutorialLevels from '../experiments/tutorial-levels/examples.json' with {type:'json'};
test('active faces filter constraints while shared state remains canonical',()=>{const p=createPlayer(fixtures.C.maps,t,[],['front']);const id=t.faceCellToPhysical('right',0,0);p.set(id,UNICORN);assert.equal(p.get(id),UNICORN);assert.equal(p.evaluate().contradictions.length,0);assert.equal(countGlobal(fixtures.C.maps,{activeFaces:['front']}).count>0,true);});
test('levels expose tutorial progression shape and persistence abstraction',()=>{const levels=makeLevels({...fixtures,tutorialLevels});assert.deepEqual(levels.map(x=>x.activeFaces.length),[1,1,2,3,6]);let data=new Map,storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};const p=createProgress(storage);p.complete(2);assert.equal(p.highest,2);assert.equal(createProgress(storage).highest,2);});
