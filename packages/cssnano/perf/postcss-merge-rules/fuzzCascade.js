import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  firstCascadeFailure,
  generateCascadeCases,
} from '../../script/postcss-merge-rules/lib/fuzzCascade.js';

test('cascade fuzzer seed 7 preserves every computed style', () => {
  assert.equal(firstCascadeFailure(generateCascadeCases(7, 300)), undefined);
});

test('second cascade fuzzer seed preserves every computed style', () => {
  assert.equal(
    firstCascadeFailure(generateCascadeCases(0xc0ffee, 300)),
    undefined
  );
});

test('cascade fuzzer with long class names, which make rules share declarations in groups, preserves every computed style', () => {
  assert.equal(
    firstCascadeFailure(generateCascadeCases(31, 1000), 100, 'q'.repeat(40)),
    undefined
  );
});

test('cascade fuzzer with class names that make groups pay only sometimes preserves every computed style and is idempotent', () => {
  assert.equal(
    firstCascadeFailure(generateCascadeCases(3, 2000), 100, 'qqqq'),
    undefined
  );
});
