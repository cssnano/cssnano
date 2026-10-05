import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  firstCascadeFailure,
  generateCascadeCases,
} from '../script/lib/fuzzCascade.js';

test('cascade fuzzer seed 7 preserves every computed style', () => {
  assert.equal(firstCascadeFailure(generateCascadeCases(7, 300)), undefined);
});

test('second cascade fuzzer seed preserves every computed style', () => {
  assert.equal(
    firstCascadeFailure(generateCascadeCases(0xc0ffee, 300)),
    undefined
  );
});
