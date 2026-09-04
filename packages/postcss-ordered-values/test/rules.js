import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenizeValue } from '../src/lib/tokenize.js';
import normalizeBorder from '../src/rules/border.js';
import normalizeBoxShadow from '../src/rules/boxShadow.js';
import normalizeAnimation from '../src/rules/animation.js';
import { normalizeGridColumnRow } from '../src/rules/grid.js';
import isTime from '../src/lib/isTime.js';

test('tokenization preserves escaped names and nested separators as one term', () => {
  const parsed = tokenizeValue('opacity 1s v\\61r(--x, min(1s, 2s))');

  assert.deepEqual(
    parsed.arguments.map((argument) => argument.map((term) => term.raw)),
    [['opacity', '1s', 'v\\61r(--x, min(1s, 2s))']]
  );
  assert.strictEqual(parsed.abort, true);
});

test('tokenization keeps bracketed names and quoted URLs atomic', () => {
  const parsed = tokenizeValue('[line name] url("a,b") 1fr');

  assert.deepEqual(
    parsed.terms.map((term) => term.raw),
    ['[line name]', 'url("a,b")', '1fr']
  );
});

test('tokenization aborts on mismatched or unclosed delimiters', () => {
  for (const value of ['a (b]', 'a [b)', 'a {b', 'a (b']) {
    assert.equal(tokenizeValue(value).abort, true, value);
  }
});

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
});

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

test('columns rejects an unclosed function before reordering', () => {
  const parsed = tokenizeValue('2 20px calc(1px');
  assert.equal(parsed.abort, true);
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

describe('Time classification', () => {
  for (const value of ['1s', '1ms']) {
    test(`${value} is a time`, () => {
      assert.equal(isTime(tokenizeValue(value).terms[0]), true);
    });
  }

  for (const value of ['1px', '1%', '1deg', '1', 'calc(1s / 1s)']) {
    test(`${value} is not a time`, () => {
      assert.equal(isTime(tokenizeValue(value).terms[0]), false);
    });
  }

  for (const value of ['calc(1s +)']) {
    test(`${value} is not classified as a direct time`, () => {
      assert.equal(isTime(tokenizeValue(value).terms[0]), false);
    });
  }
});

for (const value of [
  'calc(1s + 2s)',
  'calc(1s * 2)',
  'min(1s, 2s)',
  'clamp(1ms, calc(1s + 1s), 3s)',
]) {
  test(`${value} is a validated time`, () => {
    assert.equal(isTime(tokenizeValue(value).terms[0]), true);
  });
}

test('border rejects a top-level slash it cannot consume', () => {
  assert.equal(
    normalizeBorder(tokenizeValue('solid red 1px / blue').terms),
    null
  );
});

describe('Grid-line validation', () => {
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
});
