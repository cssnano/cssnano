import assert from 'node:assert/strict';
import { test } from 'node:test';
import { targetSupportOf } from '../../../../../src/passes/merge/lib/longhand/targetSupport.js';

test('target support is worked out once for a list shared by many files', () => {
  const targets = Object.freeze(['chrome 120', 'safari 17']);
  assert.equal(targetSupportOf(targets), targetSupportOf(targets));
});

test('the oldest target of an engine decides whether a feature is supported by all', () => {
  const modern = targetSupportOf(['chrome 150', 'chrome 151']);
  const withOld = targetSupportOf(['chrome 150', 'chrome 30']);
  assert.equal(withOld.features.isSubsetOf(modern.features), true);
  assert.equal(withOld.features.size < modern.features.size, true);
});

test('a version that is neither dotted nor TP leaves every feature unsupported', () => {
  const { features, placeShorthands } = targetSupportOf([
    'chrome 150',
    'safari preview',
  ]);
  assert.equal(features.size, 0);
  assert.equal(placeShorthands, false);
});

test('an entry without a version leaves every feature unsupported, because its engine has a floor it cannot be shown to reach', () => {
  const { features } = targetSupportOf(['chrome']);
  assert.equal(features.size, 0);
});
