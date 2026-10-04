import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import data from '../src/data/propertyGroups.json' with { type: 'json' };
import LastWriteIndex, {
  collectDeclarations,
  isOpaque,
} from '../src/lib/lastWriteIndex.js';
import { isConflictingProp } from '../src/lib/propertyRelations.js';

/** @param {string} prop */
const decl = (prop) => ({ prop });

/** @param {string} css */
const firstNode = (css) => /** @type {any} */ (postcss.parse(css).first);

/**
 * @param {string} written
 * @param {string} queried
 * @return {boolean}
 */
function conflictsAfterWrite(written, queried) {
  const index = new LastWriteIndex();
  index.record(decl(written), 1);
  return index.conflictsSince([decl(queried)], 0);
}

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

test('last-write index agrees with isConflictingProp on every pair of known property names', () => {
  const disagreements = [];
  for (const written of catalogue) {
    const index = new LastWriteIndex();
    index.record(decl(written), 1);
    for (const queried of catalogue) {
      if (
        index.conflictsSince([decl(queried)], 0) !==
        isConflictingProp(written, queried)
      ) {
        disagreements.push([written, queried]);
      }
    }
  }
  assert.deepEqual(disagreements.slice(0, 10), []);
});

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

test('last-write index ignores a write at or before the position queried', () => {
  const index = new LastWriteIndex();
  index.record(decl('color'), 3);
  assert.equal(index.conflictsSince([decl('color')], 3), false);
});

test('last-write index reports a write after the position queried', () => {
  const index = new LastWriteIndex();
  index.record(decl('color'), 4);
  assert.equal(index.conflictsSince([decl('color')], 3), true);
});

test('last-write index reports a conflict when any queried declaration conflicts', () => {
  const index = new LastWriteIndex();
  index.record(decl('color'), 1);
  assert.equal(index.conflictsSince([decl('width'), decl('color')], 0), true);
});

test('last-write index reports no conflict for an empty declaration list', () => {
  const index = new LastWriteIndex();
  index.record(decl('color'), 1);
  assert.equal(index.conflictsSince([], 0), false);
});

test('last-write index: a physical margin conflicts with the flow-relative one', () => {
  assert.equal(conflictsAfterWrite('margin-inline-start', 'margin-left'), true);
});

test('last-write index: a physical margin does not conflict with another physical side', () => {
  assert.equal(conflictsAfterWrite('margin-left', 'margin-top'), false);
});

test('last-write index: a shorthand conflicts with each of its longhands', () => {
  assert.equal(conflictsAfterWrite('margin', 'margin-top'), true);
  assert.equal(conflictsAfterWrite('margin', 'margin-left'), true);
});

test('last-write index: vendor-prefixed spelling conflicts with the unprefixed property', () => {
  assert.equal(conflictsAfterWrite('-webkit-transform', 'transform'), true);
});

test('last-write index: property names are ASCII case-insensitive', () => {
  assert.equal(conflictsAfterWrite('COLOR', 'color'), true);
});

test('last-write index: all conflicts with a later write to any ordinary property', () => {
  assert.equal(conflictsAfterWrite('all', 'color'), true);
});

test('last-write index: an ordinary write conflicts with a later all', () => {
  assert.equal(conflictsAfterWrite('color', 'all'), true);
});

test('last-write index: all does not conflict with direction', () => {
  assert.equal(conflictsAfterWrite('all', 'direction'), false);
  assert.equal(conflictsAfterWrite('direction', 'all'), false);
});

test('last-write index: all does not conflict with unicode-bidi', () => {
  assert.equal(conflictsAfterWrite('all', 'unicode-bidi'), false);
});

test('last-write index: all does not conflict with custom properties', () => {
  assert.equal(conflictsAfterWrite('all', '--x'), false);
  assert.equal(conflictsAfterWrite('--x', 'all'), false);
});

test('last-write index: a custom property conflicts only with its exact, case-sensitive name', () => {
  assert.equal(conflictsAfterWrite('--x', '--x'), true);
  assert.equal(conflictsAfterWrite('--x', '--X'), false);
  assert.equal(conflictsAfterWrite('--x', 'color'), false);
});

test('last-write index: unknown vendor properties conflict by leading segment', () => {
  assert.equal(
    conflictsAfterWrite('-webkit-box-direction', '-moz-box-direction'),
    true
  );
  assert.equal(
    conflictsAfterWrite('-webkit-box-direction', '-webkit-foo'),
    false
  );
});

test('last-write index: place-* acts as a wildcard for unknown vendor properties', () => {
  assert.equal(conflictsAfterWrite('place-x-y', '-webkit-box-direction'), true);
  assert.equal(conflictsAfterWrite('-webkit-box-direction', 'place-x-y'), true);
});

test('last-write index: moveWrites makes the moved declarations count from the new position', () => {
  const index = new LastWriteIndex();
  index.record(decl('color'), 1);
  index.moveWrites([decl('width')], 5);
  assert.equal(index.conflictsSince([decl('width')], 4), true);
  assert.equal(index.conflictsSince([decl('width')], 5), false);
});

test('last-write index: moveWrites keeps a later write to the same property', () => {
  const index = new LastWriteIndex();
  index.record(decl('color'), 7);
  index.moveWrites([decl('color')], 3);
  assert.equal(index.conflictsSince([decl('color')], 6), true);
});

test('last-write index: lastConflict returns the position of the newest conflicting write', () => {
  const index = new LastWriteIndex();
  index.record(decl('margin-top'), 1);
  index.record(decl('margin'), 2);
  index.record(decl('color'), 3);
  assert.equal(index.lastConflict(decl('margin-left')), 2);
  assert.equal(index.lastConflict(decl('width')), -1);
});

test('last-write index: recordNode records declarations inside @media, @supports and @container', () => {
  for (const css of [
    '@media print{.a{color:red}}',
    '@supports (display:grid){.a{color:red}}',
    '@container (min-width:1px){.a{color:red}}',
  ]) {
    const index = new LastWriteIndex();
    index.recordNode(firstNode(css), 1);
    assert.equal(index.conflictsSince([decl('color')], 0), true, css);
    assert.equal(index.conflictsSince([decl('width')], 0), false, css);
  }
});

test('last-write index: recordNode records declarations of nested rules', () => {
  const index = new LastWriteIndex();
  index.recordNode(firstNode('.a{width:1px;& .b{color:red}}'), 1);
  assert.equal(index.conflictsSince([decl('color')], 0), true);
});

test('last-write index: recordNode treats an at-rule it cannot analyse as a barrier', () => {
  for (const css of [
    '@layer base,theme;',
    '@layer x{.a{color:red}}',
    '@scope (.x){.a{color:red}}',
    '@unknown x{.a{color:red}}',
    '@import "x.css";',
  ]) {
    const index = new LastWriteIndex();
    index.recordNode(firstNode(css), 1);
    assert.equal(index.conflictsSince([decl('width')], 0), true, css);
  }
});

test('last-write index: recordNode ignores comments', () => {
  const index = new LastWriteIndex();
  index.recordNode(firstNode('/* note */'), 1);
  assert.equal(index.conflictsSince([decl('color')], 0), false);
});

test('last-write index: isOpaque reports whether a subtree holds an at-rule it cannot analyse', () => {
  assert.equal(isOpaque(firstNode('@media print{.a{color:red}}')), false);
  assert.equal(
    isOpaque(firstNode('@media print{@layer x{.a{color:red}}}')),
    true
  );
});

test('last-write index: collectDeclarations lists declarations at any depth and skips comments', () => {
  const root = postcss.parse(
    '@media print{.a{color:red;& .b{width:1px}}/* note */}'
  );
  assert.deepEqual(
    collectDeclarations(/** @type {any} */ (root.first)).map((d) => d.prop),
    ['color', 'width']
  );
  assert.deepEqual(
    collectDeclarations(/** @type {any} */ (postcss.parse('/* x */').first)),
    []
  );
});
