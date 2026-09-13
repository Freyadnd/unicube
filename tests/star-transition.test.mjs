import test from 'node:test';
import assert from 'node:assert/strict';
import {createStarTransition} from '../src/star-transition.mjs';
import {celestialState} from '../src/celestial-input.mjs';

test('all locked celestial state transitions', () => {
  for (const [from,action,to] of [
    [0,'single',1],[1,'single',0],[2,'single',2],
    [0,'double',2],[1,'double',2],[2,'double',0]
  ]) assert.equal(celestialState(from,action),to);
});

test('extinguish and restore reach distinct endpoints in 150ms', () => {
  const sample=createStarTransition();
  assert.equal(sample('a',0,0),0);
  assert.equal(sample('a',1,10),0);
  assert.equal(sample('a',1,85),.5);
  assert.equal(sample('a',1,160),1);
  assert.equal(sample('a',0,200),1);
  assert.equal(sample('a',0,275),.5);
  assert.equal(sample('a',0,350),0);
  assert.equal(sample('initial exclusion',1,0),1);
});

test('shared references sample one animation; interruption and double tap leave no stale exclusion', () => {
  const sample=createStarTransition(),id='6,2,6';
  sample(id,0,0);sample(id,1,10);
  assert.equal(sample(id,1,85),sample(id,1,85));
  assert.equal(sample(id,0,85),.5);
  assert.equal(sample(id,0,235),0);
  sample(id,1,240);
  assert.equal(sample(id,1,315),.5);
  assert.equal(sample(id,2,315),0);
  assert.equal(sample(id,0,400),0);
});
