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

describe('mathFunctions specification contract', () => {
  test('matches the canonical W3C CSS Values 4 math function set exactly', () => {
    assert.equal(
      cssnanoUtils.mathFunctions.size,
      ALL_EXPECTED_W3C_MATH_FUNCTIONS.length,
      `expected exactly ${ALL_EXPECTED_W3C_MATH_FUNCTIONS.length} canonical math functions`
    );

    assert.deepEqual(
      [...cssnanoUtils.mathFunctions].toSorted(),
      ALL_EXPECTED_W3C_MATH_FUNCTIONS,
      'exported mathFunctions set must be mathematically equal to the canonical W3C math functions'
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
    for (const name of cssnanoUtils.mathFunctions) {
      assert.match(
        name,
        /^[a-z][a-z0-9]*$/,
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

  test('uses the specification arity for every math function', () => {
    const expected = new Map([
      ['abs', [1, 1]],
      ['acos', [1, 1]],
      ['asin', [1, 1]],
      ['atan', [1, 1]],
      ['atan2', [2, 2]],
      ['calc', [1, 1]],
      ['clamp', [3, 3]],
      ['cos', [1, 1]],
      ['exp', [1, 1]],
      ['hypot', [1, Infinity]],
      ['log', [1, 2]],
      ['max', [1, Infinity]],
      ['min', [1, Infinity]],
      ['mod', [2, 2]],
      ['pow', [2, 2]],
      ['rem', [2, 2]],
      ['round', [1, 2]],
      ['sign', [1, 1]],
      ['sin', [1, 1]],
      ['sqrt', [1, 1]],
      ['tan', [1, 1]],
    ]);

    assert.deepEqual(
      [...cssnanoUtils.mathFunctionArgumentRanges].toSorted(),
      [...expected].toSorted()
    );
  });
});
