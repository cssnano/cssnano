import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setsLonghands } from '../src/lib/spec.js';

test('a shorthand reaches the longhands it names through nested shorthands', () => {
  assert.ok(setsLonghands('border').has('border-top-color'));
  assert.ok(setsLonghands('border-top').has('border-top-color'));
  assert.ok(setsLonghands('border-color').has('border-top-color'));
});

test('a shorthand reaches the properties it resets without naming them', () => {
  const border = setsLonghands('border');

  for (const property of [
    'border-image',
    'border-image-source',
    'border-image-slice',
    'border-image-width',
    'border-image-outset',
    'border-image-repeat',
  ]) {
    assert.ok(
      border.has(property),
      `border resets ${property}, so a declaration cannot move past one`
    );
  }
});

test('a property the data does not describe as a shorthand sets itself', () => {
  assert.deepEqual(
    setsLonghands('border-top-color'),
    new Set(['border-top-color'])
  );
  assert.deepEqual(
    setsLonghands('border-image-source'),
    new Set(['border-image-source'])
  );
  assert.deepEqual(setsLonghands('color'), new Set(['color']));
});
