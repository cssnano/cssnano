import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import flowRelativeSides from '../../src/data/flowRelativeSides.json' with { type: 'json' };
import { computedValues, writingModes } from '../lib/fuzzBoxOracle.js';

/**
 * @param {string} css
 * @param {'legacy' | 'longhands' | 'modern'} [engine]
 * @return {string[]} the distinct values the oracle computes
 */
function valuesOf(css, engine) {
  return [...new Set(Object.values(computedValues(css, engine)))];
}

describe('box oracle writing modes', () => {
  test('maps every flow-relative suffix like the generated table', () => {
    const generated = Object.fromEntries(
      flowRelativeSides.modes.map((mode) => [
        `${mode.writingMode} ${mode.direction}`,
        mode.sides,
      ])
    );
    assert.deepEqual(writingModes, generated);
  });
});

describe('box oracle CSS-wide keywords', () => {
  test('ignores a declaration that mixes inherit with another value', () => {
    assert.deepEqual(computedValues('a{margin:1px inherit}'), {});
  });

  test('ignores a declaration that repeats inherit, as a keyword takes the whole value', () => {
    assert.deepEqual(computedValues('a{padding:inherit inherit}'), {});
  });

  test('applies inherit alone to every side of the shorthand', () => {
    assert.deepEqual(valuesOf('a{margin:inherit}'), ['inherit']);
  });
});

describe('box oracle invalid values', () => {
  test('ignores a number without a unit unless it is zero', () => {
    assert.deepEqual(computedValues('a{margin-top:5}'), {});
  });

  test('ignores a declaration without a value', () => {
    assert.deepEqual(computedValues('a{margin-top:}'), {});
  });
});

describe('box oracle engines', () => {
  const physical = 'a{margin-top:1px}';
  const flowLonghand = 'a{margin-block-start:1px}';
  const flowShorthand = 'a{margin-block:1px}';

  test('keeps physical margin in the legacy engine', () => {
    assert.deepEqual(valuesOf(physical, 'legacy'), ['1px']);
  });

  test('ignores a flow-relative longhand in the legacy engine', () => {
    assert.deepEqual(computedValues(flowLonghand, 'legacy'), {});
  });

  test('applies a flow-relative longhand in the longhands engine', () => {
    assert.deepEqual(valuesOf(flowLonghand, 'longhands'), ['1px']);
  });

  test('ignores a flow-relative shorthand in the longhands engine, as it arrived later', () => {
    assert.deepEqual(computedValues(flowShorthand, 'longhands'), {});
  });

  test('applies a flow-relative shorthand in the modern engine', () => {
    assert.deepEqual(valuesOf(flowShorthand, 'modern'), ['1px']);
  });

  test('applies physical inset longhands in the legacy engine', () => {
    assert.deepEqual(valuesOf('a{top:1px}', 'legacy'), ['1px']);
  });

  test('ignores the inset shorthand in the longhands engine', () => {
    assert.deepEqual(computedValues('a{inset:1px}', 'longhands'), {});
  });

  test('ignores the scroll groups in the longhands engine', () => {
    assert.deepEqual(
      computedValues(
        'a{scroll-margin-top:1px;scroll-padding:1px}',
        'longhands'
      ),
      {}
    );
  });

  test('applies the scroll groups in the modern engine', () => {
    assert.deepEqual(valuesOf('a{scroll-margin-top:1px}', 'modern'), ['1px']);
  });

  test('defaults to the engine that understands everything', () => {
    assert.deepEqual(
      computedValues('a{inset-inline:1px}'),
      computedValues('a{inset-inline:1px}', 'modern')
    );
  });
});

describe('box oracle values', () => {
  test('treats a sum of lengths in calc() as a value of its own, not as the folded length', () => {
    assert.notDeepEqual(
      computedValues('a{margin-top:calc(1px + 2px)}'),
      computedValues('a{margin-top:3px}')
    );
  });

  test('accepts calc() of a percentage where the group takes percentages', () => {
    assert.deepEqual(valuesOf('a{padding-top:calc(10%)}'), ['calc(10%)']);
  });

  test('ignores calc() of a percentage where the group takes none', () => {
    assert.deepEqual(computedValues('a{scroll-margin-top:calc(10%)}'), {});
  });

  test('accepts anchor() inside calc() for the insets in the modern engine', () => {
    assert.deepEqual(valuesOf('a{top:calc(anchor(--a top))}', 'modern'), [
      'calc(anchor(--a top))',
    ]);
  });

  test('ignores anchor() inside calc() in an engine that predates it', () => {
    assert.deepEqual(
      computedValues('a{top:calc(anchor(--a top))}', 'longhands'),
      {}
    );
  });

  test('ignores anchor() inside calc() outside the insets', () => {
    assert.deepEqual(
      computedValues('a{margin-top:calc(anchor(--a top))}', 'modern'),
      {}
    );
  });

  test('accepts the cap unit in the modern engine', () => {
    assert.deepEqual(valuesOf('a{margin-top:1cap}', 'modern'), ['1cap']);
  });

  test('ignores the cap unit in an engine that predates it', () => {
    assert.deepEqual(computedValues('a{margin-top:1cap}', 'longhands'), {});
  });

  test('accepts var() where the engine has custom properties', () => {
    assert.equal(valuesOf('a{margin-top:var(--x)}', 'longhands').length, 1);
  });

  test('ignores var() in the legacy engine, which has no custom properties', () => {
    assert.deepEqual(computedValues('a{margin-top:var(--x)}', 'legacy'), {});
  });

  test('keeps a var() on a shorthand distinct from the same var() on a longhand, as the shorthand splits the substituted value', () => {
    assert.notDeepEqual(
      valuesOf('a{margin:var(--x)}'),
      valuesOf('a{margin-top:var(--x)}')
    );
  });

  test('gives each side of a shorthand with var() its own opaque value', () => {
    assert.equal(valuesOf('a{margin:var(--x)}').length, 4);
  });
});

describe('box oracle barriers', () => {
  test('sets no side for an alias of a box property', () => {
    assert.deepEqual(
      computedValues('a{scroll-snap-margin-top:1px;-webkit-margin-start:1px}'),
      {}
    );
  });
});

/** @param {string} value @param {'legacy' | 'longhands' | 'modern'} [engine] */
const accepts = (value, engine) =>
  Object.keys(computedValues(`a{margin-left:${value}}`, engine)).length > 0;

describe('box oracle math functions', () => {
  test('ignores a sum of a length and an angle because the sum has no type', () => {
    assert.equal(accepts('calc(1px + 2deg)'), false);
  });

  test('ignores a sum of a length and a bare number', () => {
    assert.equal(accepts('calc(1px + 2)'), false);
  });

  test('ignores a product of two lengths', () => {
    assert.equal(accepts('calc(1px * 2px)'), false);
  });

  test('ignores a quotient with a length divisor', () => {
    assert.equal(accepts('calc(2px / 1px)'), false);
  });

  test('ignores a calculation that resolves to a bare number', () => {
    assert.equal(accepts('calc(1 + 2)'), false);
  });

  test('ignores a clamp() with two arguments', () => {
    assert.equal(accepts('clamp(1px, 2px)'), false);
  });

  test('accepts a length scaled by a number inside nested parentheses', () => {
    assert.equal(accepts('calc((1px + 2em) * 2)'), true);
  });

  test('accepts a min() of a length and a percentage in a group that takes percentages', () => {
    assert.equal(accepts('min(1px, 5%)'), true);
  });

  test('ignores a percentage calculation in a group that takes no percentage', () => {
    assert.deepEqual(computedValues('a{scroll-margin-top:calc(1px + 5%)}'), {});
  });

  test('ignores min() for an engine that predates comparison functions', () => {
    assert.equal(accepts('min(1px, 2px)', 'legacy'), false);
  });

  test('accepts calc() for an engine that predates comparison functions', () => {
    assert.equal(accepts('calc(1px + 2px)', 'legacy'), true);
  });
});
