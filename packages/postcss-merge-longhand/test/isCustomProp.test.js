import assert from 'node:assert/strict';
import { test } from 'node:test';
import isCustomProp from '../src/lib/isCustomProp.js';

const declaration = (value) => ({ value });

test('recognizes a custom property after a comment in var()', () => {
  assert.equal(isCustomProp(declaration('var(/* comment */ --x)')), true);
});

test('continues after an empty var() to find a custom property', () => {
  assert.equal(isCustomProp(declaration('var() var(--x)')), true);
});

test('continues after a non-custom var() to find a custom property', () => {
  assert.equal(isCustomProp(declaration('var(invalid) var(--x)')), true);
});

test('does not classify an ordinary var() argument as a custom property', () => {
  assert.equal(isCustomProp(declaration('var(invalid)')), false);
});

test('recognizes escaped custom properties', () => {
  assert.equal(isCustomProp(declaration('var(\\--custom)')), true);
  assert.equal(isCustomProp(declaration('var(-\\-custom)')), true);
});
