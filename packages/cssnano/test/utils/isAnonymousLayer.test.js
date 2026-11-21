import { test } from 'node:test';
import assert from 'node:assert/strict';
import isAnonymousLayer from '../../src/utils/isAnonymousLayer.js';
import { tokens } from '../../src/utils/value.js';

test('isAnonymousLayer should accept a layer block with empty params', () => {
  assert.strictEqual(isAnonymousLayer(tokens('')), true);
});

test('isAnonymousLayer should accept a layer block with whitespace-only params', () => {
  assert.strictEqual(isAnonymousLayer(tokens('   ')), true);
});

test('isAnonymousLayer should accept a layer block whose params are only a comment', () => {
  assert.strictEqual(isAnonymousLayer(tokens('/* x */')), true);
});

test('isAnonymousLayer should accept a layer block whose params are only an important comment', () => {
  assert.strictEqual(isAnonymousLayer(tokens('/*! x */')), true);
});

test('isAnonymousLayer should reject a layer block with a name', () => {
  assert.strictEqual(isAnonymousLayer(tokens('base')), false);
});

test('isAnonymousLayer should reject a layer block with a comment and a name', () => {
  assert.strictEqual(isAnonymousLayer(tokens('/* x */ base')), false);
});

test('isAnonymousLayer should reject a layer block whose name is followed by a comment', () => {
  assert.strictEqual(isAnonymousLayer(tokens('a/* c */')), false);
});
