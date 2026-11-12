import assert from 'node:assert/strict';
import { test } from 'node:test';
import { targetSupportOf } from '../../../../../src/passes/merge/lib/longhand/targetSupport.js';

test('the same targets give the same support, so a run may work it out once and pass it on', () => {
  const targets = Object.freeze(['chrome 120', 'safari 17']);
  const first = targetSupportOf(targets);
  const second = targetSupportOf(targets);
  assert.deepEqual(
    [...first.features].toSorted(),
    [...second.features].toSorted()
  );
  assert.deepEqual(
    [...first.pairShorthands].toSorted(),
    [...second.pairShorthands].toSorted()
  );
  assert.equal(first.placeShorthands, second.placeShorthands);
  assert.equal(
    first.boxSupport.supportsAll('inset'),
    second.boxSupport.supportsAll('inset')
  );
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
