import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { tokenizeValue } from '../src/lib/tokenize.js';
import normalizeAnimation from '../src/rules/animation.js';
import normalizeBorder from '../src/rules/border.js';
import normalizeBoxShadow from '../src/rules/boxShadow.js';
import normalizeColumns from '../src/rules/columns.js';
import normalizeListStyle from '../src/rules/listStyle.js';
import normalizeTransition from '../src/rules/transition.js';

describe('Border', () => {
  test('border order handles max', () => {
    assert.strictEqual(
      normalizeBorder(tokenizeValue('red max(3em, 48px)').terms),
      'max(3em, 48px) red'
    );
  });

  test('border order handles mixed color and width functions', () => {
    assert.strictEqual(
      normalizeBorder(
        tokenizeValue('rgba(0, 50, 50, 0.4) solid clamp(3em, 0.5vw, 48px)')
          .terms
      ),
      'clamp(3em, 0.5vw, 48px) solid rgba(0, 50, 50, 0.4)'
    );
  });

  test('border rejects a top-level slash it cannot consume', () => {
    assert.equal(
      normalizeBorder(tokenizeValue('solid red 1px / blue').terms),
      null
    );
  });
});

describe('Box shadow', () => {
  test('box-shadow aborts on functions it cannot classify', () => {
    assert.strictEqual(
      normalizeBoxShadow(tokenizeValue('inset 0 min(1em, 1px) 0 1px red')),
      null
    );
  });

  test('box-shadow preserves inset() functions', () => {
    assert.strictEqual(
      normalizeBoxShadow(tokenizeValue('red 2px 5px inset()')),
      null
    );
  });

  test('box-shadow rejects an unclosed function', () => {
    const parsed = tokenizeValue('paint(foo 2px 5px');
    assert.equal(parsed.abort, true);
  });
});

describe('Columns', () => {
  test('columns rejects an unclosed function before reordering', () => {
    const parsed = tokenizeValue('2 20px calc(1px');
    assert.equal(parsed.abort, true);
  });

  test('reorders count and width to width first', () => {
    assert.strictEqual(
      normalizeColumns(tokenizeValue('2 20px').terms),
      '20px 2'
    );
  });

  test('preserves already ordered width and count', () => {
    assert.strictEqual(
      normalizeColumns(tokenizeValue('20px 2').terms),
      '20px 2'
    );
  });

  test('reorders auto and length with preserved casing and escapes', () => {
    assert.strictEqual(
      normalizeColumns(tokenizeValue('AUTO 12em').terms),
      '12em AUTO'
    );
    assert.strictEqual(
      normalizeColumns(tokenizeValue('\\61uto 12em').terms),
      '12em \\61uto'
    );
  });

  test('rejects CSS-wide keywords combined with values', () => {
    for (const kw of [
      'inherit',
      'initial',
      'unset',
      'revert',
      'revert-layer',
      'INHERIT',
      '\\69nherit',
    ]) {
      assert.strictEqual(
        normalizeColumns(tokenizeValue(`${kw} 3rem`).terms),
        null
      );
      assert.strictEqual(
        normalizeColumns(tokenizeValue(`3rem ${kw}`).terms),
        null
      );
    }
  });

  test('rejects invalid identifiers', () => {
    for (const ident of ['foo', 'none', 'default', 'solid']) {
      assert.strictEqual(
        normalizeColumns(tokenizeValue(`${ident} 20px`).terms),
        null
      );
      assert.strictEqual(
        normalizeColumns(tokenizeValue(`20px ${ident}`).terms),
        null
      );
    }
  });

  test('rejects invalid column counts', () => {
    for (const count of ['0', '-1', '2.5', '9007199254740992']) {
      assert.strictEqual(
        normalizeColumns(tokenizeValue(`${count} 20px`).terms),
        null
      );
    }
  });

  test('accepts positive integer column counts with explicit plus sign', () => {
    assert.strictEqual(
      normalizeColumns(tokenizeValue('+2 20px').terms),
      '20px +2'
    );
    assert.strictEqual(
      normalizeColumns(tokenizeValue('20px +2').terms),
      '20px +2'
    );
    assert.strictEqual(
      normalizeColumns(tokenizeValue('+2 +20px').terms),
      '+20px +2'
    );
    assert.strictEqual(
      normalizeColumns(tokenizeValue('+20px +2').terms),
      '+20px +2'
    );
  });

  test('rejects invalid column widths', () => {
    for (const width of ['1foo', '-1px', '-0px', '10deg', '10s', '50%']) {
      assert.strictEqual(
        normalizeColumns(tokenizeValue(`2 ${width}`).terms),
        null
      );
    }
  });

  test('rejects non-binary arities and ambiguous auto combinations', () => {
    assert.strictEqual(normalizeColumns(tokenizeValue('20px').terms), null);
    assert.strictEqual(normalizeColumns(tokenizeValue('2').terms), null);
    assert.strictEqual(normalizeColumns(tokenizeValue('auto').terms), null);
    assert.strictEqual(
      normalizeColumns(tokenizeValue('3rem 2 12em').terms),
      null
    );
    assert.strictEqual(normalizeColumns(tokenizeValue('2 auto').terms), null);
    assert.strictEqual(normalizeColumns(tokenizeValue('auto 2').terms), null);
    assert.strictEqual(
      normalizeColumns(tokenizeValue('auto auto').terms),
      null
    );
    assert.strictEqual(
      normalizeColumns(tokenizeValue('20px 20px').terms),
      null
    );
  });
});

describe('Animation', () => {
  test('animation order handles calc', () => {
    assert.strictEqual(
      normalizeAnimation(tokenizeValue('0ms opacity calc(1ms)')),
      'opacity 0ms calc(1ms)'
    );
  });

  test('animation order handles max', () => {
    assert.strictEqual(
      normalizeAnimation(tokenizeValue('0ms opacity max(-1 * 1ms, 1ms)')),
      'opacity 0ms max(-1 * 1ms, 1ms)'
    );
  });
});

describe('Fail-closed grammar conformance', () => {
  test('animation fails closed on excess times and negative duration', () => {
    assert.strictEqual(
      normalizeAnimation(tokenizeValue('1s calc(2s) calc(3s)')),
      null
    );
    assert.strictEqual(
      normalizeAnimation(tokenizeValue('-1s ease infinite')),
      null
    );
  });

  test('transition fails closed on invalid and negative times', () => {
    assert.strictEqual(normalizeTransition(tokenizeValue('-1s ease')), null);
    assert.strictEqual(normalizeTransition(tokenizeValue('1s 2s 3s')), null);
  });

  test('box-shadow fails closed on invalid length count and unitless length', () => {
    assert.strictEqual(normalizeBoxShadow(tokenizeValue('10px red')), null);
    assert.strictEqual(
      normalizeBoxShadow(tokenizeValue('10px 10px 10px 10px 10px red')),
      null
    );
    assert.strictEqual(normalizeBoxShadow(tokenizeValue('10 10px red')), null);
  });

  test('border fails closed on auto style and non-zero unitless width', () => {
    assert.strictEqual(
      normalizeBorder(tokenizeValue('solid 5 red').terms),
      null
    );
    assert.strictEqual(
      normalizeBorder(tokenizeValue('auto red 1px').terms),
      null
    );
    assert.strictEqual(
      normalizeBorder(tokenizeValue('solid auto 1px').terms),
      null
    );
  });

  test('list-style fails closed on unknown functions and supports counter/counters', () => {
    assert.strictEqual(
      normalizeListStyle(tokenizeValue('foo() inside').terms),
      null
    );
    assert.strictEqual(
      normalizeListStyle(tokenizeValue('counter(x) inside').terms),
      'counter(x) inside'
    );
  });

  test('border fails closed on invalid tokens, delimiters, and CSS-wide keywords', () => {
    assert.strictEqual(
      normalizeBorder(tokenizeValue('solid 10% red').terms),
      null
    );
    assert.strictEqual(
      normalizeBorder(tokenizeValue('solid url(foo.png) 1px').terms),
      null
    );
    assert.strictEqual(
      normalizeBorder(tokenizeValue('solid "string" 1px').terms),
      null
    );
    assert.strictEqual(
      normalizeBorder(tokenizeValue('solid red 1px / blue').terms),
      null
    );
    for (const kw of [
      'initial',
      'inherit',
      'unset',
      'revert',
      'revert-layer',
      'default',
    ]) {
      assert.strictEqual(
        normalizeBorder(tokenizeValue(`solid ${kw} 1px`).terms),
        null
      );
    }
  });

  test('box-shadow fails closed on delimiters, percentages, strings, URLs, and multiple colors', () => {
    assert.strictEqual(
      normalizeBoxShadow(tokenizeValue('10px 10px / 5px')),
      null
    );
    assert.strictEqual(
      normalizeBoxShadow(tokenizeValue('10px 10px 50%')),
      null
    );
    assert.strictEqual(
      normalizeBoxShadow(tokenizeValue('10px 10px "blur"')),
      null
    );
    assert.strictEqual(
      normalizeBoxShadow(tokenizeValue('10px 10px url(foo)')),
      null
    );
    assert.strictEqual(
      normalizeBoxShadow(tokenizeValue('10px 10px red blue')),
      null
    );
    assert.strictEqual(
      normalizeBoxShadow(tokenizeValue('10px 10px url("foo.png")')),
      null
    );
    assert.strictEqual(
      normalizeBoxShadow(tokenizeValue('none 10px 10px')),
      null
    );
    assert.strictEqual(
      normalizeBoxShadow(tokenizeValue('10px 10px none')),
      null
    );
    for (const kw of [
      'initial',
      'inherit',
      'unset',
      'revert',
      'revert-layer',
      'default',
    ]) {
      assert.strictEqual(
        normalizeBoxShadow(tokenizeValue(`${kw} 10px 10px`)),
        null
      );
      assert.strictEqual(
        normalizeBoxShadow(tokenizeValue(`10px 10px ${kw}`)),
        null
      );
    }
  });

  test('animation fails closed on delimiters and CSS-wide keywords', () => {
    assert.strictEqual(normalizeAnimation(tokenizeValue('1s / ease')), null);
    for (const kw of [
      'initial',
      'inherit',
      'unset',
      'revert',
      'revert-layer',
      'default',
    ]) {
      assert.strictEqual(
        normalizeAnimation(tokenizeValue(`1s ease ${kw}`)),
        null
      );
    }
  });

  test('transition fails closed on delimiters and CSS-wide keywords', () => {
    assert.strictEqual(
      normalizeTransition(tokenizeValue('opacity / 1s')),
      null
    );
    for (const kw of [
      'initial',
      'inherit',
      'unset',
      'revert',
      'revert-layer',
      'default',
    ]) {
      assert.strictEqual(normalizeTransition(tokenizeValue(`${kw} 1s`)), null);
    }
  });
});
