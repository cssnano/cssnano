import assert from 'node:assert/strict';
import { test } from 'node:test';
import cssnanoUtils from '../../src/utils/index.js';

const { isSubstitutionFunction } = cssnanoUtils;

test('isSubstitutionFunction recognizes var(), env() and constant() as substitutions', () => {
  for (const name of ['var', 'env', 'constant']) {
    assert.equal(isSubstitutionFunction(name), true, name);
  }
});

test('isSubstitutionFunction recognizes attr() and if(), whose type comes from their context', () => {
  assert.equal(isSubstitutionFunction('attr'), true);
  assert.equal(isSubstitutionFunction('if'), true);
});

test('isSubstitutionFunction recognizes a custom function, whose name starts with two hyphens', () => {
  assert.equal(isSubstitutionFunction('--size'), true);
});

test('isSubstitutionFunction leaves a math function alone, since its result is computed here', () => {
  assert.equal(isSubstitutionFunction('calc'), false);
});

test('isSubstitutionFunction leaves a color function alone, since its result is known', () => {
  assert.equal(isSubstitutionFunction('rgb'), false);
});

test('isSubstitutionFunction matches the whole name, not a prefix of it', () => {
  assert.equal(isSubstitutionFunction('variable'), false);
});
