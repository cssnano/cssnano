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

test('a physical box shorthand sets the four physical longhands and no flow-relative one because flow-relative properties only alias them', () => {
  assert.deepEqual(
    setsLonghands('inset'),
    new Set(['top', 'right', 'bottom', 'left'])
  );
  assert.deepEqual(
    setsLonghands('scroll-padding'),
    new Set([
      'scroll-padding-top',
      'scroll-padding-right',
      'scroll-padding-bottom',
      'scroll-padding-left',
    ])
  );
});

test('an axis shorthand sets its start and end longhands', () => {
  assert.deepEqual(
    setsLonghands('margin-block'),
    new Set(['margin-block-start', 'margin-block-end'])
  );
  assert.deepEqual(
    setsLonghands('inset-inline'),
    new Set(['inset-inline-start', 'inset-inline-end'])
  );
});
