import assert from 'node:assert/strict';
import { test } from 'node:test';
import { random } from './fuzzRng.js';

// Fuzz loops seed from 1 upward, so small seeds must not start near 0.
test('the first draws of seeds 1 to 50 reach every tenth of the unit interval', () => {
  const tenths = new Set();
  for (let seed = 1; seed <= 50; seed++) {
    tenths.add(random(seed).int(10));
  }
  assert.equal(tenths.size, 10);
});
