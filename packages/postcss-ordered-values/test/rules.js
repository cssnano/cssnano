import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenizeValue } from '../src/lib/tokenize.js';
import normalizeBorder from '../src/rules/border.js';
import normalizeBoxShadow from '../src/rules/boxShadow.js';
import normalizeAnimation from '../src/rules/animation.js';
import normalizeColumns from '../src/rules/columns.js';
import normalizeListStyle from '../src/rules/listStyle.js';
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

describe('Time classification', () => {
  for (const value of ['1s', '1ms']) {
    test(`${value} is a time`, () => {
      assert.equal(isTime(tokenizeValue(value).terms[0]), true);
    });
  }

  for (const value of [
    '1px',
    '1%',
    '1deg',
    '1',
    'calc(1s / 1s)',
    'calc(1s * sin(0, 1))',
    'calc(1s * sin(1s))',
    'calc(1s * sin(10px))',
    'calc(1s * asin(0.5))',
    'calc(1s * sqrt(4s))',
    'calc(1s * pow(2s, 3))',
    'calc(1s * pow(2))',
    'calc(1s * sqrt(4, 2))',
    'calc(1s * log(10, 2, 3))',
    'calc(1s * exp())',
    'calc(1s + sin(0))',
    'calc(sin(0))',
    'calc(asin(0.5))',
    'calc(1s)*2',
    'sign(50px)',
    'atan2(1s, 2s)',
    'sqrt(4)',
    'pow(2, 3)',
    'log(10)',
    'exp(1)',
    'cos(0deg)',
    'tan(0deg)',
    'calc(1s + calc(1s)*2)',
    'calc(1 / 1s)',
    'round(1s)',
    'calc(1s * round(1s))',
    'calc(1s * round(1s, 200ms))',
    'calc(max(1s, 10px))',
    'calc(1s (2s))',
    'calc(1s + + 2s)',
    'calc((1s, 2s))',
    'min(, 1s)',
    'calc(1s]',
    'calc(1s',
    'mod(10s, 3px)',
    'hypot(3s, 4px)',
  ]) {
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
  'min(1s)',
  'max(100ms)',
  'min(1s, 2s)',
  'clamp(1ms, calc(1s + 1s), 3s)',
  'calc(1s * sin(0))',
  'calc(1s * cos(0))',
  'calc(1s * tan(0))',
  'calc(1s * sin(30deg))',
  'calc(1s * cos(45deg))',
  'calc(1s * tan(0.25turn))',
  'calc(1s * sin(1rad))',
  'calc(1s * sin(100grad))',
  'calc(1s * sqrt(4))',
  'calc(1s * pow(2, 3))',
  'calc(1s * log(10))',
  'calc(1s * log(10, 2))',
  'calc(1s * exp(1))',
  'calc(1s * sign(50px))',
  'calc(1s * sign(-5s))',
  'calc(1s * sin(asin(0.5)))',
  'calc(1s * sin(acos(0.5)))',
  'calc(1s * sin(atan(1)))',
  'calc(1s * sin(atan2(1s, 2s)))',
  'abs(1s)',
  'calc(abs(-5s))',
  'hypot(3s, 4s)',
  'mod(10s, 3s)',
  'rem(10s, 3s)',
  'round(1s, 200ms)',
  'calc(1s * round(2))',
  'calc(1s + round(1s, 200ms))',
  'calc(2 * round(1s, 200ms))',
  'calc((1s + 2s) * 2)',
  'calc(1s * (2 + 3))',
  'calc(10s / 2)',
  'calc(1s * 2 + 3s)',
]) {
  test(`${value} is a validated time`, () => {
    assert.equal(isTime(tokenizeValue(value).terms[0]), true);
  });
}

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

test('border rejects a top-level slash it cannot consume', () => {
  assert.equal(
    normalizeBorder(tokenizeValue('solid red 1px / blue').terms),
    null
  );
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

describe('Tokenizer boundary invariants', () => {
  test('aborts on unexpected closing delimiters at top level', () => {
    for (const value of ['1px solid red )', '10px ]', '} 10px']) {
      assert.equal(tokenizeValue(value).abort, true, value);
    }
  });

  test('handles empty or whitespace-only inputs without crashing', () => {
    for (const value of ['', '   ', '\t\n']) {
      const result = tokenizeValue(value);
      assert.equal(result.terms.length, 0);
      assert.equal(result.abort, false);
    }
  });

  test('splits consecutive and leading/trailing top-level slashes cleanly', () => {
    const parsed = tokenizeValue('10px / / 20px');
    assert.deepEqual(
      parsed.terms.map((term) => term.raw),
      ['10px', '/', '/', '20px']
    );
  });

  test('preserves inner function whitespace and nested separators byte-for-byte', () => {
    const parsed = tokenizeValue('calc( 10px  +  20px ) rgb(0 0 0 / 50%)');
    assert.deepEqual(
      parsed.terms.map((term) => term.raw),
      ['calc( 10px  +  20px )', 'rgb(0 0 0 / 50%)']
    );
  });
});
