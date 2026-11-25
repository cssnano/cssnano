import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { tokenize } from '@csstools/css-tokenizer';
import {
  isFunctionOfType,
  mathType,
} from '../../../src/merge/longhand/mathType.js';
import { isValidLengthPercentage } from '../../../src/merge/longhand/validateRadius.js';

/**
 * Component tokens never include the end-of-file token that the tokenizer
 * appends, so it is dropped before the expression is typed.
 *
 * @param {string} css
 * @return {string | undefined} the type of the whole input as one expression
 */
const typeOf = (css) => {
  const tokens = tokenize({ css }).slice(0, -1);
  return mathType(tokens, 0, tokens.length);
};

test('types mod() of two lengths as a length', () => {
  assert.equal(typeOf('mod(5px, 2px)'), 'length');
});

test('types round() with a leading rounding strategy and two lengths as a length', () => {
  assert.equal(typeOf('round(up, 1px, 2px)'), 'length');
});

test('types a one-argument round() of a number as a number', () => {
  assert.equal(typeOf('round(2.5)'), 'number');
});

test('types round() with a rounding strategy and one number as a number', () => {
  assert.equal(typeOf('round(up, 2.5)'), 'number');
});

test('rejects round() with a rounding strategy and one length, because only a number may omit its second argument', () => {
  assert.equal(typeOf('round(up, 1px)'), undefined);
});

test('rejects round() whose rounding strategy has no comma after it', () => {
  assert.equal(typeOf('round(up 2.5)'), undefined);
});

test('types sign() of a length as a number', () => {
  assert.equal(typeOf('sign(1px)'), 'number');
});

test('types a log() nested in a length product as a length', () => {
  assert.equal(typeOf('calc(log(10, 2) * 1px)'), 'length');
});

test('types pow() of two numbers as a number', () => {
  assert.equal(typeOf('pow(2, 3)'), 'number');
});

test('rejects a one-argument round() of a length, because only a number may omit its second argument', () => {
  assert.equal(typeOf('round(1px)'), undefined);
});

test('rejects a round() whose only argument is a rounding strategy', () => {
  assert.equal(typeOf('round(up)'), undefined);
});

test('rejects a round() whose rounding strategy is not its first argument', () => {
  assert.equal(typeOf('round(1px, up, 2px)'), undefined);
});

test('rejects a round() whose rounding strategy follows a number, because a strategy is not a number', () => {
  assert.equal(typeOf('round(2.5, up)'), undefined);
});

test('rejects a mod() with one argument', () => {
  assert.equal(typeOf('mod(1px)'), undefined);
});

test('rejects a mod() that mixes a length and a number', () => {
  assert.equal(typeOf('mod(1px, 2)'), undefined);
});

test('rejects pow() of a length, because its arguments must be numbers', () => {
  assert.equal(typeOf('pow(1px, 2)'), undefined);
});

test('rejects sqrt() of a length, because its argument must be a number', () => {
  assert.equal(typeOf('sqrt(1px)'), undefined);
});

test('leaves a trigonometric angle undecided, because angles are not typed', () => {
  assert.equal(typeOf('sin(1deg)'), undefined);
});

test('types round() of a calc() number as a number', () => {
  assert.equal(typeOf('round(calc(1 + 2))'), 'number');
});

test('rejects a nested round() of a length, because the inner one has one length argument', () => {
  assert.equal(typeOf('round(round(1px))'), undefined);
});

test('types round() of two numbers whose first is a one-number round() as a number', () => {
  assert.equal(typeOf('round(round(1), 2)'), 'number');
});

test('rejects round() of a calc() length alone, because a lone argument must be a number', () => {
  assert.equal(typeOf('round(calc(1px + 2px))'), undefined);
});

/**
 * @param {string} css
 * @param {readonly import('../../../src/merge/longhand/mathType.js').MathType[]} accepted
 * @return {boolean}
 */
const functionOfType = (css, accepted) => {
  const list = tokenize({ css }).slice(0, -1);
  return isFunctionOfType(list, 0, list.length, accepted);
};

describe('isFunctionOfType with a range that is not one complete function', () => {
  test('rejects a calc() followed by a word, because the range is two components', () => {
    assert.equal(functionOfType('calc(1px) foo', ['length']), false);
  });

  test('rejects a calc() directly followed by an ident, because the range is more than one function', () => {
    assert.equal(functionOfType('calc(1px)bar', ['length']), false);
  });

  test('rejects a calc() followed by var(), because a substitution cannot make two components one length', () => {
    assert.equal(
      functionOfType('calc(1%) var(--x)', ['length', 'length-percentage']),
      false
    );
  });

  test('rejects var() followed by a length, because the range is two components', () => {
    assert.equal(functionOfType('var(--x) 1px', ['length']), false);
  });

  test('accepts a lone var(), which defers the check to computed-value time', () => {
    assert.equal(functionOfType('var(--x)', ['length']), true);
  });

  test('accepts a calc() length', () => {
    assert.equal(functionOfType('calc(1px + 2px)', ['length']), true);
  });
});

test('validateRadius rejects a calc() beside var() as one term', () => {
  const list = tokenize({ css: 'calc(1%) var(--x)' }).slice(0, -1);
  assert.equal(isValidLengthPercentage(list), false);
});
