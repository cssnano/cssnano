import nodetest from 'node:test';
import assert from 'node:assert/strict';
import { isConflictingProp } from '../src/lib/propertyRelations.js';

const { test } = nodetest;
// A subset of these shorthand/longhand relations is also spot-checked in
// script/lib/webrefProperties.mjs's validate(), which runs at data-acquire
// time rather than test time. Keep both in sync.
/** @type {[string, string, boolean][]} */
const cases = [
  // Same property, however spelled
  ['color', 'color', true],
  ['COLOR', 'color', true],
  ['-webkit-transform', 'transform', true],
  ['-webkit-background-clip', 'background', true],
  // Prefixed spellings webref lists as known in their own right, with no
  // `legacyAliasOf` back to the unprefixed property
  ['-webkit-user-select', 'user-select', true],
  // Shorthands and the longhands they set
  ['font', 'line-height', true],
  ['font', 'font-weight', true],
  ['border-bottom', 'border-color', true],
  ['border', 'border-top-style', true],
  ['gap', 'row-gap', true],
  ['inset', 'top', true],
  ['columns', 'column-count', true],
  ['flex-flow', 'flex-wrap', true],
  ['grid-area', 'grid-row', true],
  ['white-space', 'text-wrap', true],
  ['place-content', 'align-content', true],
  ['place-items', 'justify-items', true],
  // Shorthands that reset a longhand they cannot set
  ['border', 'border-image-source', true],
  ['font', 'font-feature-settings', true],
  ['background', 'background-blend-mode', true],
  // Independent properties in the same family
  ['font-family', 'font-feature-settings', false],
  ['border', 'border-radius', false],
  ['border', 'border-collapse', false],
  ['border-top-width', 'border-bottom-width', false],
  ['flex', 'flex-direction', false],
  ['animation', 'animation-composition', false],
  ['place-items', 'align-content', false],
  ['color', 'color-scheme', false],
  // Unrelated properties
  ['place-items', 'appearance', false],
  ['font', 'border', false],
  // Logical and physical properties can be the same side
  ['margin-inline-start', 'margin-top', true],
  ['inset-inline-start', 'left', true],
  ['width', 'inline-size', true],
  ['margin-inline-start', 'margin-block-start', false],
  ['margin', 'margin-inline-start', true],
  // `all` resets everything but these two
  ['all', 'color', true],
  ['all', 'direction', false],
  ['all', 'unicode-bidi', false],
  ['color', 'all', true],
  // Custom properties are only ever set by themselves
  ['--a', '--b', false],
  ['--a', '--a', true],
  ['--Foo', '--foo', false],
  ['--color', 'color', false],
  ['all', '--a', false],
  // Vendor extensions we have no data for stay conservative
  ['-moz-osx-font-smoothing', 'font-family', false],
  ['-ms-flex', 'flex-grow', true],
  ['-o-tab-size', 'tab-size', true],
];

for (const [propA, propB, expected] of cases) {
  test(`isConflictingProp(${propA}, ${propB}) is ${expected}`, () => {
    assert.strictEqual(isConflictingProp(propA, propB), expected);
    assert.strictEqual(
      isConflictingProp(propB, propA),
      expected,
      'the relation should be symmetric'
    );
  });
}

test('property names are not looked up on Object.prototype', () => {
  for (const prop of ['constructor', 'toString', 'hasOwnProperty']) {
    assert.strictEqual(isConflictingProp(prop, 'color'), false);
    assert.strictEqual(isConflictingProp(prop, prop), true);
  }
});

// Vendor extensions no spec describes fall back to comparing names, which is
// what the plugin did for every property before it had spec data.
for (const [propA, propB, expected] of [
  ['-webkit-box-orient', '-webkit-box-direction', false],
  ['-webkit-box-direction', '-webkit-box-orient', false],
  ['-ms-flex-pack', '-ms-flex-align', false],
  ['-webkit-box-direction', '-webkit-box', true],
  ['-webkit-box-direction', 'color', false],
  // `place` is a wildcard leading segment, matching non-`place` bases too
  ['-moz-place-content', 'align-content', true],
]) {
  test(`isConflictingProp(${propA}, ${propB}) is ${expected} without data`, () => {
    assert.strictEqual(isConflictingProp(propA, propB), expected);
  });
}
