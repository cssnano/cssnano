'use strict';

const { describe, test } = require('node:test');

const assert = require('node:assert/strict');

const {
  counter,
  counterStyle,
  grid,
  keyframes,
  resolveAtRule,
  resolveProperty,
} = require('../src/lib/slots.js');

// The slots themselves are spot-checked in script/lib/webrefIdents.mjs's
// validate(), which runs at data-acquire time rather than test time: that
// catches a webref release dropping one, these catch a regression in how
// slots.js reads the generated file.

/** @type {[string, string][]} */
const properties = [
  ['color', 'color'],
  ['COLOR', 'color'],
  // Prefixed spellings webref lists an alias for
  ['-webkit-animation-name', 'animation-name'],
  // and prefixed spellings it does not, which name keyframes all the same
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
  // The rest of the animation family holds keywords of its own
  assert.ok(!keyframes.properties.has('animation-timing-function'));
  assert.ok(!keyframes.properties.has('animation-timeline'));
});

describe('Knows', () => {
  test('knows where a counter style can be named', () => {
    assert.ok(counterStyle.properties.has('list-style-type'));
    assert.ok(counterStyle.descriptors.has('fallback'));
    // `content` names one inside a counter function rather than as a bare word
    assert.ok(!counterStyle.properties.has('content'));
    assert.ok(counterStyle.functionProperties.has('content'));
  });

  test('knows where a counter can be named inside a function', () => {
    assert.ok(counter.functionProperties.has('content'));
    // webref's `string-set` grammar never reaches `counter()`, so the slot is
    // supplied by hand and a regression there is silent
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
  // The descriptors reserve their own keywords too, not just `list-style`'s
  assert.ok(counterStyle.reservedKeywords.includes('words'));
  assert.ok(counterStyle.reservedKeywords.includes('fixed'));
  assert.ok(grid.reservedKeywords.includes('span'));
  // A function name is written with an argument list, so a name is free to be
  // spelled that way
  assert.ok(!grid.reservedKeywords.includes('minmax'));
});
