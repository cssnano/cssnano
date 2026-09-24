import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  counter,
  counterStyle,
  grid,
  keyframes,
  resolveAtRule,
  resolveProperty,
} from '../src/lib/slots.js';

// Spot-check the slots here for regressions in how slots.js reads the
// generated file; webrefIdents.mjs validates them at data-acquire time.

/** @type {[string, string][]} */
const properties = [
  ['color', 'color'],
  ['COLOR', 'color'],
  // Cover prefixed spellings webref aliases
  ['-webkit-animation-name', 'animation-name'],
  // Cover prefixed spellings it does not alias, which still name keyframes
  ['-moz-animation-name', 'animation-name'],
  ['-ms-grid-row', 'grid-row'],
];

for (const [prop, expected] of properties) {
  test(`resolveProperty(${prop}) is ${expected}`, () => {
    assert.strictEqual(resolveProperty(prop), expected);
  });
}

/** @type {[string, string][]} */
const atRules = [
  ['keyframes', 'keyframes'],
  ['KEYFRAMES', 'keyframes'],
  ['-webkit-keyframes', 'keyframes'],
  ['-moz-keyframes', 'keyframes'],
  ['counter-style', 'counter-style'],
];

for (const [name, expected] of atRules) {
  test(`resolveAtRule(${name}) is ${expected}`, () => {
    assert.strictEqual(resolveAtRule(name), expected);
  });
}

test('knows the properties that name keyframes', () => {
  assert.ok(keyframes.properties.has('animation'));
  assert.ok(keyframes.properties.has('animation-name'));
  // Exclude the rest of the family, which holds keywords
  assert.ok(!keyframes.properties.has('animation-timing-function'));
  assert.ok(!keyframes.properties.has('animation-timeline'));
});

describe('Knows', () => {
  test('knows where a counter style can be named', () => {
    assert.ok(counterStyle.properties.has('list-style-type'));
    assert.ok(counterStyle.descriptors.has('fallback'));
    // Name a counter style inside a function, not as a bare word
    assert.ok(!counterStyle.properties.has('content'));
    assert.ok(counterStyle.functionProperties.has('content'));
  });

  test('knows where a counter can be named inside a function', () => {
    assert.ok(counter.functionProperties.has('content'));
    // Supply this slot by hand: webref's `string-set` grammar never reaches
    // `counter()`
    assert.ok(counter.functionProperties.has('string-set'));
  });

  test('knows which argument of a counter function names what', () => {
    assert.deepStrictEqual(counter.functions.get('counter'), [0]);
    assert.deepStrictEqual(counterStyle.functions.get('counter'), [1]);
    assert.deepStrictEqual(counter.functions.get('target-counters'), [1]);
    assert.deepStrictEqual(counterStyle.functions.get('target-counters'), [3]);
  });

  test('knows the grid properties that name and that place', () => {
    assert.ok(grid.templateProperties.has('grid'));
    assert.ok(grid.templateProperties.has('grid-template-areas'));
    assert.ok(grid.referenceProperties.has('grid-area'));
    assert.ok(!grid.referenceProperties.has('grid-template'));
  });
});

test('reserves the keywords a name would be ambiguous with', () => {
  assert.ok(keyframes.reservedKeywords.includes('linear'));
  assert.ok(counterStyle.reservedKeywords.includes('inside'));
  // Reserve the descriptors' own keywords too
  assert.ok(counterStyle.reservedKeywords.includes('words'));
  assert.ok(counterStyle.reservedKeywords.includes('fixed'));
  assert.ok(grid.reservedKeywords.includes('span'));
  // Leave function names unreserved: a name can be spelled like a function
  // call
  assert.ok(!grid.reservedKeywords.includes('minmax'));
});
