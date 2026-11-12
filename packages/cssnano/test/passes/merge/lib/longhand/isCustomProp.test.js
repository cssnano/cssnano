import assert from 'node:assert/strict';
import { test } from 'node:test';
import isCustomProp from '../../../../../src/passes/merge/lib/longhand/isCustomProp.js';
import { itemOf } from './helpers/declarationItems.js';

/* Checks a declaration the way the merge pass does: through the text table. */
const check = (value) => isCustomProp(itemOf(`margin: ${value}`));

test('recognizes a custom property after a comment in var()', () => {
  assert.equal(check('var(/* comment */ --x)'), true);
});

test('continues after an empty var() to find a custom property', () => {
  assert.equal(check('var() var(--x)'), true);
});

test('continues after a non-custom var() to find a custom property', () => {
  assert.equal(check('var(invalid) var(--x)'), true);
});

test('does not classify an ordinary var() argument as a custom property', () => {
  assert.equal(check('var(invalid)'), false);
});

test('recognizes escaped custom properties', () => {
  assert.equal(check('var(\\--custom)'), true);
  assert.equal(check('var(-\\-custom)'), true);
});
