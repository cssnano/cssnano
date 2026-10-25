import { test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import { sourceParams } from '../../src/utils/sourceText.js';

test('sourceParams reads the raw prelude while it matches params', () => {
  const atRule = postcss.parse('@media a /* c */ b {}').first;
  assert.equal(sourceParams(atRule), 'a /* c */ b');
});

test('sourceParams gives params once a plugin has reassigned them', () => {
  const atRule = postcss.parse('@media a /* c */ b {}').first;
  atRule.params = 'screen';
  assert.equal(sourceParams(atRule), 'screen');
});
