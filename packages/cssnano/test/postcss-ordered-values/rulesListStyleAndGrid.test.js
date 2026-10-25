import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { tokenizeValue as tokenizeTokens } from '../../src/plugins/postcss-ordered-values/lib/tokenize.js';
import { normalizeGridColumnRow as normalizeGridColumnRowTokens } from '../../src/plugins/postcss-ordered-values/rules/grid.js';
import normalizeListStyleTokens from '../../src/plugins/postcss-ordered-values/rules/listStyle.js';
import cssnanoUtils from '#utils';

/**
 * The text a rule writes for its tokens, or null when it rejects the value.
 *
 * @param {(...args: any[]) => import('@csstools/css-tokenizer').CSSToken[] | null} rule
 */
const asText =
  (rule) =>
  (...args) => {
    const tokens = rule(...args);
    return tokens === null ? null : tokens.map((token) => token[1]).join('');
  };
const normalizeGridColumnRow = asText(normalizeGridColumnRowTokens);
const normalizeListStyle = asText(normalizeListStyleTokens);

/** The tokens of a value text, as a stage reads them. */
const tokenizeValue = (text) => tokenizeTokens(cssnanoUtils.tokens(text));

describe('List-style validation', () => {
  test('normalizes list-style with uppercase and escaped keywords', () => {
    assert.strictEqual(
      normalizeListStyle(tokenizeValue('NONE inside none').terms),
      'NONE inside none'
    );
    assert.strictEqual(
      normalizeListStyle(tokenizeValue('none inside NONE').terms),
      'none inside NONE'
    );
    assert.strictEqual(
      normalizeListStyle(tokenizeValue('inside \\6e one disc').terms),
      'disc inside \\6e one'
    );
  });

  test('normalizes list-style string counter type', () => {
    assert.strictEqual(
      normalizeListStyle(tokenizeValue('inside ">"').terms),
      '">" inside'
    );
  });

  test('normalizes custom counter-style ident with none', () => {
    assert.strictEqual(
      normalizeListStyle(tokenizeValue('my-counter inside none').terms),
      'my-counter inside none'
    );
    assert.strictEqual(
      normalizeListStyle(tokenizeValue('none inside my-counter').terms),
      'my-counter inside none'
    );
    assert.strictEqual(
      normalizeListStyle(tokenizeValue('none my-counter').terms),
      'my-counter none'
    );
    assert.strictEqual(
      normalizeListStyle(tokenizeValue('my-counter none').terms),
      'my-counter none'
    );
  });

  test('normalizes string counter type with none in any order', () => {
    assert.strictEqual(
      normalizeListStyle(tokenizeValue('none inside ">"').terms),
      '">" inside none'
    );
    assert.strictEqual(
      normalizeListStyle(tokenizeValue('">" inside none').terms),
      '">" inside none'
    );
  });

  test('normalizes symbols() function as a counter-style type', () => {
    assert.strictEqual(
      normalizeListStyle(
        tokenizeValue("inside symbols(cyclic '*' 'o') none").terms
      ),
      "symbols(cyclic '*' 'o') inside none"
    );
  });

  test('normalizes list-style with image and single none as type', () => {
    assert.strictEqual(
      normalizeListStyle(tokenizeValue('url(a.png) inside none').terms),
      'none inside url(a.png)'
    );
    assert.strictEqual(
      normalizeListStyle(tokenizeValue('none url(a.png)').terms),
      'none url(a.png)'
    );
  });

  test('normalizes list-style with string counter-style containing slash', () => {
    assert.strictEqual(
      normalizeListStyle(tokenizeValue('inside "/"').terms),
      '"/" inside'
    );
  });

  test('normalizes list-style symbols() function combined with image', () => {
    assert.strictEqual(
      normalizeListStyle(
        tokenizeValue("symbols(cyclic '*' 'o') inside url(a.png)").terms
      ),
      "symbols(cyclic '*' 'o') inside url(a.png)"
    );
  });

  test('normalizes list-style with image function', () => {
    assert.strictEqual(
      normalizeListStyle(
        tokenizeValue('inside linear-gradient(red, blue) disc').terms
      ),
      'disc inside linear-gradient(red, blue)'
    );
  });

  test('rejects unclassified tokens, extra terms, and duplicate slots in list-style', () => {
    assert.strictEqual(
      normalizeListStyle(tokenizeValue('inside 10px').terms),
      null
    );
    assert.strictEqual(
      normalizeListStyle(tokenizeValue('inside / foo').terms),
      null
    );
    assert.strictEqual(
      normalizeListStyle(tokenizeValue('inside outside disc').terms),
      null
    );
    assert.strictEqual(
      normalizeListStyle(tokenizeValue('disc square inside').terms),
      null
    );
    assert.strictEqual(
      normalizeListStyle(tokenizeValue('none none none').terms),
      null
    );
    assert.strictEqual(
      normalizeListStyle(tokenizeValue('initial disc').terms),
      null
    );
    assert.strictEqual(
      normalizeListStyle(tokenizeValue('default inside disc').terms),
      null
    );
    assert.strictEqual(
      normalizeListStyle(tokenizeValue('url(a.png) disc none').terms),
      null
    );
    assert.strictEqual(
      normalizeListStyle(tokenizeValue('disc url(a.png) none').terms),
      null
    );
    assert.strictEqual(
      normalizeListStyle(tokenizeValue('disc none none').terms),
      null
    );
    assert.strictEqual(
      normalizeListStyle(tokenizeValue('url(a.png) url(b.png)').terms),
      null
    );
    assert.strictEqual(
      normalizeListStyle(tokenizeValue('symbols(cyclic) disc').terms),
      null
    );
    assert.strictEqual(
      normalizeListStyle(tokenizeValue('">" disc').terms),
      null
    );
    assert.strictEqual(
      normalizeListStyle(tokenizeValue('disc inside none extra').terms),
      null
    );
  });
});

describe('Grid-line validation', () => {
  test('normalizes a single grid-line longhand directly as a string', () => {
    assert.strictEqual(
      normalizeGridColumnRow(tokenizeValue('2 span').terms, 1),
      'span 2'
    );
    assert.strictEqual(
      normalizeGridColumnRow(tokenizeValue('span 2').terms, 1),
      'span 2'
    );
  });

  test('normalizes a standalone custom-ident grid-line', () => {
    assert.strictEqual(
      normalizeGridColumnRow(tokenizeValue('custom-name / 3').terms),
      'custom-name/3'
    );
    assert.strictEqual(
      normalizeGridColumnRow(tokenizeValue('3 / custom-name').terms),
      '3/custom-name'
    );
    assert.strictEqual(
      normalizeGridColumnRow(tokenizeValue('custom-name').terms, 1),
      'custom-name'
    );
  });

  test('normalizes a span with an integer operand', () => {
    assert.equal(
      normalizeGridColumnRow(tokenizeValue('2 span/7').terms),
      'span 2/7'
    );
  });

  test('normalizes an ordinary integer before its custom-ident', () => {
    assert.equal(
      normalizeGridColumnRow(tokenizeValue('foo -2/3').terms),
      '-2 foo/3'
    );
  });

  test('accepts none as a custom-ident operand', () => {
    assert.equal(
      normalizeGridColumnRow(tokenizeValue('none span/2').terms),
      'span none/2'
    );
  });

  test('rejects a bare span, zero, or a CSS-wide keyword as a grid-line', () => {
    assert.equal(normalizeGridColumnRow(tokenizeValue('2/span').terms), null);
    assert.equal(normalizeGridColumnRow(tokenizeValue('0/2').terms), null);
    assert.equal(normalizeGridColumnRow(tokenizeValue('span 0/2').terms), null);
    assert.equal(
      normalizeGridColumnRow(tokenizeValue('initial/2').terms),
      null
    );
  });

  test('rejects two integers or an auto companion in one grid-line', () => {
    assert.equal(normalizeGridColumnRow(tokenizeValue('2 3/4').terms), null);
    assert.equal(normalizeGridColumnRow(tokenizeValue('2 auto/4').terms), null);
  });

  test('rejects more than two grid-lines', () => {
    assert.equal(normalizeGridColumnRow(tokenizeValue('2/3/4').terms), null);
  });

  test('rejects a slash in a single-line longhand', () => {
    assert.equal(
      normalizeGridColumnRow(tokenizeValue('2 span/7').terms, 1),
      null
    );
  });

  test('normalizes standalone custom-ident grid-lines on both sides of slash', () => {
    assert.strictEqual(
      normalizeGridColumnRow(tokenizeValue('header / footer').terms),
      'header/footer'
    );
    assert.strictEqual(
      normalizeGridColumnRow(tokenizeValue('span header / span footer').terms),
      'span header/span footer'
    );
  });

  test('rejects grid integers exceeding Number.MAX_SAFE_INTEGER', () => {
    assert.strictEqual(
      normalizeGridColumnRow(tokenizeValue('9007199254740992').terms, 1),
      null
    );
    assert.strictEqual(
      normalizeGridColumnRow(tokenizeValue('-9007199254740992').terms, 1),
      null
    );
    assert.strictEqual(
      normalizeGridColumnRow(tokenizeValue('span 9007199254740992').terms, 1),
      null
    );
  });
});
