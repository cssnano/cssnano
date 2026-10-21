import assert from 'node:assert/strict';
import { test } from 'node:test';
import { firstMergeFailure } from '../../../../../script/passes/merge/rules/fuzzMerge.js';
import {
  generateFamilyCases,
  generateResetCases,
} from '../../../../../script/passes/merge/rules/lib/mergeOracle.js';

test('preset-default keeps the computed styles of generated family stylesheets, seed 7', () => {
  assert.equal(firstMergeFailure(generateFamilyCases(7, 300)), undefined);
});

test('preset-default keeps the computed styles of generated family stylesheets, seed 0xc0ffee', () => {
  assert.equal(
    firstMergeFailure(generateFamilyCases(0xc0ffee, 300)),
    undefined
  );
});

test('preset-default keeps the computed styles of generated stylesheets that reset families with all, seed 7', () => {
  assert.equal(firstMergeFailure(generateResetCases(7, 300)), undefined);
});
