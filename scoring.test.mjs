import test from 'node:test';
import assert from 'node:assert/strict';
import { average, scoreASQ, scoreSUS } from './scoring.mjs';

test('SUS computes the alternating ten-item score', () => {
  assert.equal(scoreSUS([1, 5, 1, 5, 1, 5, 1, 5, 1, 5]), 0);
  assert.equal(scoreSUS([5, 1, 5, 1, 5, 1, 5, 1, 5, 1]), 100);
  assert.equal(scoreSUS([3, 3, 3, 3, 3, 3, 3, 3, 3, 3]), 50);
});

test('SUS requires ten valid answers', () => {
  assert.equal(scoreSUS([3, 3]), null);
  assert.equal(scoreSUS([3, 3, 3, 3, 3, 3, 3, 3, 3, 6]), null);
});

test('ASQ averages only answered numeric items', () => {
  assert.equal(scoreASQ([1, 2, 3]), 2);
  assert.equal(scoreASQ([1, null, 7]), 4);
  assert.equal(scoreASQ([null, null, null]), null);
  assert.equal(scoreASQ([1, 8, null]), 1);
});

test('average handles empty and finite numbers', () => {
  assert.equal(average([]), null);
  assert.equal(average([null, 2, 4]), 3);
});
