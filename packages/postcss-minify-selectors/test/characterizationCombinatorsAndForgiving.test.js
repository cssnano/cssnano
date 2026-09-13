import assert from 'node:assert/strict';
import { test } from 'node:test';
import parser from 'postcss-selector-parser';
import postcss from 'postcss';
import plugin from '../src/index.js';
import { normalizeList } from '../src/lib/selectorScanner.js';
import { parsesSelectorList } from './referenceAst.js';

function minify(selector) {
  return postcss([plugin({ convertToIs: false })]).process(`${selector}{x:y}`, {
    from: undefined,
  }).css;
}

test('normalizes nested selector-list functions and nth formulas', () => {
  const input =
    ':is( .b, :not( .a, .a ), :where("a,b", .x /* comment */), .b, .\\61 )';
  assert.equal(minify(input), ':is(.b,:not(.a),:where(.x),.\\61){x:y}');
  assert.equal(
    minify(':is(:nth-child( 2n + 1 ), :nth-last-child( even ))'),
    ':is(:nth-child(odd),:nth-last-child(2n)){x:y}'
  );
  assert.equal(
    minify(':is( .z, .a, .z )'),
    minify(minify(':is( .z, .a, .z )').slice(0, -5))
  );
});

test('preserves framework selector pseudos as opaque source fragments', () => {
  const cases = [
    [':global( .a, .b )', ':global( .a, .b )'],
    [':deep( .a > .b )', ':deep( .a > .b )'],
    [
      ':global( .\\61 /* comment */, :deep(.b) )',
      ':global( .\\61 /* comment */, :deep(.b) )',
    ],
    [':custom-framework( 123 )', ':custom-framework( 123 )'],
  ];
  for (const [input, expected] of cases)
    assert.equal(normalizeList(input, false, false), expected, input);
  for (const input of [':global(.a', ':deep(.a, .b'])
    assert.equal(normalizeList(input, false, false), input, input);
});

test('comments between attribute values and modifiers prevent folding', () => {
  for (const value of ['x', '"x"']) {
    for (const modifier of ['i', 's']) {
      const input = `.scope [a=${value}/**/${modifier}],.scope .b`;
      const output = normalizeList(input, false, true);
      assert.equal(
        output,
        `.scope [a=${value.replaceAll('"', '')} ${modifier}],.scope .b`
      );
      assert.equal(output.includes(':is('), false, input);
    }
  }
});

test('uses each supported functional pseudo grammar conservatively', () => {
  assert.equal(normalizeList(':has(> .a, .b)', false, false), ':has(>.a,.b)');
  assert.equal(
    normalizeList(
      ':host( .a ),:host-context( .b ),:slotted( .d )',
      false,
      false
    ),
    ':host(.a),:host-context(.b),:slotted(.d)'
  );
  assert.equal(
    normalizeList(':nth-child(2n + 1 of .a, #b)', false, false),
    ':nth-child(2n+1 of .a,#b)'
  );
  assert.equal(
    normalizeList(':nth-of-type(2n + 1 of .a)', false, false),
    ':nth-of-type(2n + 1 of .a)'
  );
  assert.equal(
    normalizeList(':custom( .a,  x )', false, false),
    ':custom( .a,  x )'
  );
});

test('preserves leading combinators in relative selectors after trivia', () => {
  for (const combinator of ['>', '+', '~', '||']) {
    assert.equal(
      normalizeList(`:has( ${combinator} .x)`, false, false),
      `:has(${combinator}.x)`
    );
    assert.equal(
      normalizeList(
        `:has( /* ordinary */ ${combinator} /* ordinary */ .x)`,
        false,
        false
      ),
      `:has(${combinator}.x)`
    );
    assert.equal(
      normalizeList(`:has( /*! preserved */ ${combinator} .x)`, false, false),
      `:has(/*! preserved */${combinator}.x)`
    );
    assert.equal(
      normalizeList(
        `:has( /*! preserved */ ${combinator} /*! preserved */ .x)`,
        false,
        false
      ),
      `:has(/*! preserved */${combinator}/*! preserved */.x)`
    );
  }
  assert.equal(
    normalizeList(':has( /* ordinary */ /*! preserved */ > .x)', false, false),
    ':has(/*! preserved */>.x)'
  );
  assert.equal(
    normalizeList(':has( /*! c1 */ /*! c2 */ > .x)', false, false),
    ':has(/*! c1 *//*! c2 */>.x)'
  );
});

test('preserves invalid unforgiving functions as their complete raw source', () => {
  const invalidHas = [':has(, .a)', ':has(.a,)', ':has(.a > > .b)'];
  for (const input of invalidHas) {
    assert.equal(normalizeList(input, false, false), input, input);
    assert.equal(minify(input), `${input}{x:y}`, `plugin: ${input}`);
    assert.equal(
      normalizeList(`:not(${input})`, false, false),
      `:not(${input})`
    );
    assert.equal(
      normalizeList(`:nth-child(2n of ${input})`, false, false),
      `:nth-child(2n of ${input})`
    );
  }
  assert.equal(
    normalizeList(':is(.ok,:has(.a,,.b))', false, false),
    ':is(.ok)'
  );
});

test('preserves top-level malformed and invalid selectors without corruption', () => {
  const cases = [
    ['div >', 'div >'],
    ['[a=]', '[a=]'],
    [':not(> a)', ':not(> a)'],
    [':has(+)', ':has(+)'],
    [':has(div, )', ':has(div, )'],
  ];
  for (const [input, expected] of cases) {
    assert.equal(normalizeList(input, false, false), expected, input);
    assert.equal(minify(input), `${expected}{x:y}`, input);
  }
});

test('drops only known-invalid forgiving selector members', () => {
  for (const input of [':is("x",.ok)', ':is(.ok,[a=])'])
    assert.equal(normalizeList(input, false, false), ':is(.ok)', input);
  for (const input of [':not("x",.ok)', ':not(.ok,[a=])'])
    assert.equal(normalizeList(input, false, false), input, input);
});

test('preserves invalid relative selectors with nested has and pseudo-elements', () => {
  for (const input of [':has(:has(.a))', ':has(.a::before)'])
    assert.equal(normalizeList(input, false, false), input, input);
});

test('models the column combinator structurally and preserves namespace forms', () => {
  assert.equal(normalizeList('.a || .b', false, false), '.a||.b');
  assert.equal(
    normalizeList('.a /* c */ || /* c */ .b', false, false),
    '.a||.b'
  );
  assert.equal(
    normalizeList('ns|E,*|E,|E,ns|*,*|*,|*', false, false),
    'ns|E,*|E,|E,ns|*,*|*,|*'
  );
  assert.equal(normalizeList('.x||.a,.x||.b', false, true), '.x||.a,.x||.b');
});

test('removes ordinary comment and whitespace runs around combinators', () => {
  for (const combinator of ['>', '+', '~']) {
    assert.equal(
      normalizeList(`.a /**/ ${combinator} /**/ .b`, false, false),
      `.a${combinator}.b`
    );
  }
});

test('does not fold comment-derived descendant boundaries into is', () => {
  const input = '.scope .a/**/.x .tail,.scope .b/**/.x .tail';
  assert.equal(
    normalizeList(input, false, true),
    '.scope .a .x .tail,.scope .b .x .tail'
  );
});

test('preserves important comments across compound boundaries', () => {
  assert.equal(
    normalizeList('.a /*! keep */ .b', false, false),
    '.a /*! keep */ .b'
  );
  assert.equal(
    normalizeList(':is(.a /*! keep */ .b)', false, false),
    ':is(.a /*! keep */ .b)'
  );
});

test('preserves literal private-use identifier code points', () => {
  const input =
    'a\uE0000\uE001,[data-x="a,b"]a\uE0000\uE001,:is("a,b",a\uE0000\uE001)';
  const output = normalizeList(input, false, false);
  assert.equal(
    output,
    'a\uE0000\uE001,[data-x="a,b"]a\uE0000\uE001,:is(a\uE0000\uE001)'
  );
  assert.equal(normalizeList(output, false, false), output);
});

test('scanner normalization remains parseable and preserves nested boundaries', () => {
  const cases = [
    ['.\\31 23, .a\\,b, [data-x="a,b"]', 3],
    [':is(:where(.a, .b), :not(.c, :has(.d))), :nth-child(2n of .x, #y)', 2],
    ['svg|a[lang=en i], |*[data-v~= "x" s]', 2],
  ];
  for (const [input, selectorCount] of cases) {
    const output = normalizeList(input, false, false);
    assert.equal(parsesSelectorList(output), true, output);
    assert.equal(output.includes('('), input.includes('('), input);
    assert.equal(parser().astSync(output).nodes.length, selectorCount, input);
  }
});

test('malformed and unclosed selectors remain non-throwing', () => {
  for (const input of [':is(.a', ':not([a=x)', '[a=x', ':where("a,b"']) {
    assert.doesNotThrow(() => normalizeList(input, false, false), input);
    assert.equal(normalizeList(input, false, false), input, input);
  }
});
