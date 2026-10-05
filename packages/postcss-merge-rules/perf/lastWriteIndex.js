import assert from 'node:assert/strict';
import { test } from 'node:test';
import data from '../src/data/propertyGroups.json' with { type: 'json' };
import LastWriteIndex from '../src/lib/lastWriteIndex.js';
import { isConflictingProp } from '../src/lib/propertyRelations.js';

/** @param {string} prop */
const decl = (prop) => ({ prop });

// The index is an independent implementation of isConflictingProp, which stays
// the definition of when two properties set the same underlying property.
const catalogue = [
  ...data.properties,
  ...Object.keys(data.aliases),
  ...Object.keys(data.shorthands),
  'all',
  '--x',
  '--X',
  'COLOR',
  'Margin-Left',
  '-webkit-box-direction',
  '-moz-box-direction',
  '-webkit-box-flex-extra',
  '-webkit-foo',
  '-moz-foo',
  'foo-bar',
  '-webkit-foo-bar',
  '-webkit-place-x',
  'place-x',
  'place-x-y',
  'unknown-property',
];

test('last-write index agrees with isConflictingProp when many properties were written', () => {
  const sample = catalogue.filter((_, i) => i % 7 === 0);
  const index = new LastWriteIndex();
  for (const [i, prop] of sample.entries()) index.record(decl(prop), i + 1);
  for (const queried of catalogue) {
    for (let since = 0; since < sample.length; since++) {
      const expected = sample
        .slice(since)
        .some((written) => isConflictingProp(written, queried));
      assert.equal(
        index.conflictsSince([decl(queried)], since),
        expected,
        `${queried} since ${since}`
      );
    }
  }
});
