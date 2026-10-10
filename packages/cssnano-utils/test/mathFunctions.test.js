import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import cssnanoUtils from '../src/index.js';

/*
 * Independent specification oracle structured from W3C CSS Values 4 (§10) by
 * result type, the partition every consumer projects from. Deliberately
 * written out per group instead of derived from the exported set, so adding a
 * name to the table without classifying it fails here.
 */

// Arguments fix the result type, so these can yield a length, angle, time,
// number or percentage depending on what they are given.
const W3C_TYPE_PRESERVING_MATH_FUNCTIONS = [
  'abs',
  'calc',
  'clamp',
  'max',
  'min',
  'mod',
  'rem',
  'round',
  'sign',
  'hypot',
];

// Result is always a <number>, whatever the arguments' type.
const W3C_NUMBER_RETURNING_MATH_FUNCTIONS = [
  'cos',
  'exp',
  'log',
  'pow',
  'sin',
  'sqrt',
  'tan',
];

// Result is always an <angle>.
const W3C_ANGLE_RETURNING_MATH_FUNCTIONS = ['acos', 'asin', 'atan', 'atan2'];

const ALL_EXPECTED_W3C_MATH_FUNCTIONS = [
  ...W3C_TYPE_PRESERVING_MATH_FUNCTIONS,
  ...W3C_NUMBER_RETURNING_MATH_FUNCTIONS,
  ...W3C_ANGLE_RETURNING_MATH_FUNCTIONS,
].toSorted();

const NOT_MATH_FUNCTIONS = [
  // Substitution functions (CSS Values 4 §3): unresolved, not computed.
  'var',
  'env',
  'constant',
  'attr',
  // Colour notations (CSS Color 4) that share no math grammar.
  'rgb',
  'hsl',
  'hwb',
  'lab',
  'lch',
  'oklab',
  'oklch',
  'color',
  'color-mix',
  'color-function',
  // Images, positions and easing: math-looking, never math-typed.
  'linear-gradient',
  'radial-gradient',
  'conic-gradient',
  'repeating-conic-gradient',
  'cross-fade',
  'image-set',
  'anchor-size',
  'cubic-bezier',
  'steps',
  'linear',
  'translate',
  'rotate',
  'minmax',
  'fit-content',
  'counter',
  'format',
];

// Argument grammars as written in CSS Values 4 §10, so arities are derived
// from the specification rather than copied from the table under test.
const W3C_MATH_FUNCTION_GRAMMARS = new Map([
  ['calc', '<calc-sum>'],
  ['min', '<calc-sum>#'],
  ['max', '<calc-sum>#'],
  ['clamp', '[ <calc-sum> | none ], <calc-sum>, [ <calc-sum> | none ]'],
  ['round', '<rounding-strategy>?, <calc-sum>, <calc-sum>?'],
  ['mod', '<calc-sum>, <calc-sum>'],
  ['rem', '<calc-sum>, <calc-sum>'],
  ['sin', '<calc-sum>'],
  ['cos', '<calc-sum>'],
  ['tan', '<calc-sum>'],
  ['asin', '<calc-sum>'],
  ['acos', '<calc-sum>'],
  ['atan', '<calc-sum>'],
  ['atan2', '<calc-sum>, <calc-sum>'],
  ['pow', '<calc-sum>, <calc-sum>'],
  ['sqrt', '<calc-sum>'],
  ['hypot', '<calc-sum>#'],
  ['log', '<calc-sum>, <calc-sum>?'],
  ['exp', '<calc-sum>'],
  ['abs', '<calc-sum>'],
  ['sign', '<calc-sum>'],
]);

/**
 * The inclusive range of calculation arguments a grammar production accepts.
 * Keyword arguments such as <rounding-strategy> are not calculations.
 * @param {string} production
 * @return {[number, number]}
 */
function calculationArity(production) {
  let least = 0;
  let most = 0;
  for (const argument of production.split(',')) {
    const term = argument.trim();
    if (!term.includes('<calc-sum>')) continue;
    if (term.endsWith('#')) return [least + 1, Infinity];
    if (!term.endsWith('?')) least++;
    most++;
  }
  return [least, most];
}

describe('mathFunctions specification contract', () => {
  test('matches the canonical W3C CSS Values 4 math function set exactly', () => {
    assert.equal(
      cssnanoUtils.mathFunctions.size,
      ALL_EXPECTED_W3C_MATH_FUNCTIONS.length,
      `expected exactly ${ALL_EXPECTED_W3C_MATH_FUNCTIONS.length} canonical math functions`
    );

    assert.deepEqual(
      [...cssnanoUtils.mathFunctions.keys()].toSorted(),
      ALL_EXPECTED_W3C_MATH_FUNCTIONS,
      'exported mathFunctions names must be mathematically equal to the canonical W3C math functions'
    );
  });

  test('classifies every function into exactly one result-type group', () => {
    const preserving = new Set(W3C_TYPE_PRESERVING_MATH_FUNCTIONS);
    const numbers = new Set(W3C_NUMBER_RETURNING_MATH_FUNCTIONS);
    const angles = new Set(W3C_ANGLE_RETURNING_MATH_FUNCTIONS);

    assert.equal(
      preserving.size + numbers.size + angles.size,
      ALL_EXPECTED_W3C_MATH_FUNCTIONS.length,
      'result-type groups must not overlap or duplicate a name'
    );
    assert.ok(preserving.isDisjointFrom(numbers));
    assert.ok(preserving.isDisjointFrom(angles));
    assert.ok(numbers.isDisjointFrom(angles));
  });

  test('satisfies syntactic invariants for CSS function names', () => {
    for (const name of cssnanoUtils.mathFunctions.keys()) {
      assert.match(
        name,
        /^[a-z][a-z0-9]*$/v,
        `function "${name}" must be non-empty, lowercase and free of separators`
      );
    }
  });

  test('is strictly disjoint from functions that are not CSS math functions', () => {
    for (const name of NOT_MATH_FUNCTIONS) {
      assert.equal(
        cssnanoUtils.mathFunctions.has(name),
        false,
        `mathFunctions must not contain non-math function "${name}"`
      );
    }
  });

  test('accepts the number of calculations each CSS Values 4 grammar allows', () => {
    for (const [name, production] of W3C_MATH_FUNCTION_GRAMMARS) {
      assert.deepEqual(
        cssnanoUtils.mathFunctions.get(name),
        calculationArity(production),
        `${name}(${production})`
      );
    }
  });

  test('has a grammar production for every math function', () => {
    assert.deepEqual(
      [...W3C_MATH_FUNCTION_GRAMMARS.keys()].toSorted(),
      ALL_EXPECTED_W3C_MATH_FUNCTIONS
    );
  });
});

describe('calcSumFunctions supplement contract', () => {
  test('is strictly disjoint from the canonical math function set', () => {
    for (const name of cssnanoUtils.calcSumFunctions) {
      assert.equal(
        cssnanoUtils.mathFunctions.has(name),
        false,
        `calcSumFunctions must not duplicate canonical math function "${name}"`
      );
    }
  });

  test('is strictly disjoint from functions that are not CSS math functions', () => {
    for (const name of NOT_MATH_FUNCTIONS) {
      assert.equal(
        cssnanoUtils.calcSumFunctions.has(name),
        false,
        `calcSumFunctions must not contain non-math function "${name}"`
      );
    }
  });

  test('satisfies syntactic invariants for CSS function names', () => {
    for (const name of cssnanoUtils.calcSumFunctions) {
      assert.match(
        name,
        /^[a-z][a-z0-9\-]*$/v,
        `function "${name}" must be non-empty, lowercase and free of spaces`
      );
    }
  });

  test('excludes the progress notations dropped by CSS Values 5 (CSSWG Issue 11826)', () => {
    // CSS Values 5 replaced these with relevant units inside progress().
    assert.equal(
      cssnanoUtils.calcSumFunctions.has('media-progress'),
      false,
      'media-progress() was dropped from CSS Values 5 and must not be classified as accepting <calc-sum> arguments'
    );
    assert.equal(
      cssnanoUtils.calcSumFunctions.has('container-progress'),
      false,
      'container-progress() was dropped from CSS Values 5 and must not be classified as accepting <calc-sum> arguments'
    );
  });

  test('classifies every CSS Values 5 function with <calc-sum> arguments', () => {
    // Written out from the CSS Values 5 grammars, so an unclassified addition
    // fails here.
    const CALC_SUM_ARGUMENT_FUNCTIONS = [
      'calc-interpolate',
      'calc-mix',
      'calc-size',
      'progress',
      'random',
    ];

    for (const name of CALC_SUM_ARGUMENT_FUNCTIONS) {
      assert.equal(
        cssnanoUtils.calcSumFunctions.has(name),
        true,
        `"${name}" accepts <calc-sum> arguments and must be classified`
      );
    }
  });
});
