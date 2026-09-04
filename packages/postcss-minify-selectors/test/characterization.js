import assert from 'node:assert/strict';
import { test } from 'node:test';
import parser from 'postcss-selector-parser';
import postcss from 'postcss';
import plugin from '../src/index.js';
import { normalizeList, specificityOf } from '../src/lib/selectorScanner.js';
import { parsesSelectorList } from './referenceAst.js';

const corpus = [
  ['.card, .card, article.card', '.card,article.card'],
  ['div /* comment */ > :is(.a, .b)', 'div>:is(.a,.b)'],
  ['[data-value="a,b"][lang = "en" i]', '[data-value="a,b"][lang=en i]'],
  ['svg|* , |* , .\\31 23', '.\\31 23,svg|*,|*'],
  ['*|a, *|*, *|*.class', '*|*,*|*.class,*|a'],
  ['svg|*, *|a, |a, |*', '*|a,svg|*,|*,|a'],
  [':not(:is(.a, .b)), :nth-child(2n + 1)', ':not(:is(.a,.b)),:nth-child(odd)'],
  [
    '.a\\,b, .a\\,b, .x[attr="(deep, value)"]',
    '.a\\,b,.x[attr="(deep, value)"]',
  ],
  ['h1/**/p, .a/* comment */.b', '.a .b,h1 p'],
  [
    'a\\E0000\\E001, a\\E0000\\E001[attr="x,y"]',
    'a\\E0000\\E001,a\\E0000\\E001[attr="x,y"]',
  ],
];

function minify(selector) {
  return postcss([plugin({ convertToIs: false })]).process(`${selector}{x:y}`, {
    from: undefined,
  }).css;
}

test('selector characterization corpus preserves reference bytes and is idempotent', () => {
  for (const [input, expected] of corpus) {
    const output = minify(input);
    assert.equal(output, `${expected}{x:y}`, input);
    assert.equal(minify(output.slice(0, -5)), output, `idempotence: ${input}`);
  }
});

test('large selector lists complete without recursive overflow', () => {
  const input = Array.from({ length: 3000 }, (_, i) => `.item-${i}`).join(',');
  const output = minify(input);
  assert.match(output, /^\.item-0,/u);
  assert.match(output, /\.item-2999(?:,|\{)/u);
});

test('normalizes every attribute operator without leaking state between attributes', () => {
  const input = '[a = x i][b ~= y s][c |= z i][d ^= q s][e $= r i][f *= t s]';
  assert.equal(
    minify(input),
    '[a=x i][b~=y s][c|=z i][d^=q s][e$=r i][f*=t s]{x:y}'
  );
});

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
    ['div >', 'div>'],
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

test('normalizes deeply nested supported selector functions without a depth cap', () => {
  const input = `${':is( '.repeat(1000)}.item${')'.repeat(1000)}`;
  assert.doesNotThrow(() => minify(input));
  assert.equal(
    minify(input),
    `${':is('.repeat(1000)}.item${')'.repeat(1000)}{x:y}`
  );
});

test('does not retain serialized output for nested functions with siblings', () => {
  const depth = 32_000;
  const input = `${':is(.x'.repeat(depth)}.item${')'.repeat(depth)}`;
  assert.equal(normalizeList(input, false, false), input);
});

test('keeps nested selector lists with sibling members structural', () => {
  const depth = 12_000;
  const input = `${':is(.x,'.repeat(depth)}.item${')'.repeat(depth)}`;
  assert.equal(normalizeList(input, false, false), input);
});

test('keeps deeply nested opaque functions as source spans until serialization', () => {
  const depth = 32_000;
  const input = `${':framework('.repeat(depth)}.item${')'.repeat(depth)}`;
  assert.equal(normalizeList(input, false, false), input);
});

test('normalizes nth formulas when of selector list is present', () => {
  assert.equal(
    normalizeList(':nth-child(even of .a)', false, false),
    ':nth-child(2n of .a)'
  );
  assert.equal(
    normalizeList(':nth-child(EVEN of .a)', false, false),
    ':nth-child(2n of .a)'
  );
  assert.equal(
    normalizeList(':nth-child(even of .a, #b)', false, false),
    ':nth-child(2n of .a,#b)'
  );
  assert.equal(
    normalizeList(':nth-child(2n + 1 of .a)', false, false),
    ':nth-child(2n+1 of .a)'
  );
  assert.equal(
    normalizeList(':nth-child( 2n + 1 of .a )', false, false),
    ':nth-child(2n+1 of .a)'
  );
  assert.equal(
    normalizeList(':nth-child(odd of .a)', false, false),
    ':nth-child(odd of .a)'
  );
  assert.equal(
    normalizeList(':nth-child(ODD of .a)', false, false),
    ':nth-child(odd of .a)'
  );
  assert.equal(
    normalizeList(':nth-last-child(even of .a)', false, false),
    ':nth-last-child(2n of .a)'
  );
  assert.equal(
    normalizeList(':nth-last-child(EVEN of .a)', false, false),
    ':nth-last-child(2n of .a)'
  );
  assert.equal(
    normalizeList(':nth-last-child(2n + 1 of .a)', false, false),
    ':nth-last-child(2n+1 of .a)'
  );
  assert.equal(
    normalizeList(':nth-last-child( 2n + 1 of .a )', false, false),
    ':nth-last-child(2n+1 of .a)'
  );
  assert.equal(
    normalizeList(':nth-last-child(odd of .a)', false, false),
    ':nth-last-child(odd of .a)'
  );
});

test('drops invalid delimiter operators in forgiving lists', () => {
  assert.equal(normalizeList(':is([attr~], .ok)', false, false), ':is(.ok)');
  assert.equal(normalizeList(':is([attr^], .ok)', false, false), ':is(.ok)');
  assert.equal(normalizeList(':is([attr$], .ok)', false, false), ':is(.ok)');
  assert.equal(normalizeList(':is([attr*], .ok)', false, false), ':is(.ok)');
  assert.equal(normalizeList(':is([attr|=], .ok)', false, false), ':is(.ok)');
  assert.equal(normalizeList(':is([attr=], .ok)', false, false), ':is(.ok)');
  assert.equal(
    normalizeList(':where([attr~], .ok)', false, false),
    ':where(.ok)'
  );
  assert.equal(
    normalizeList(':where([attr^], .ok)', false, false),
    ':where(.ok)'
  );
  assert.equal(
    normalizeList(':where([attr$], .ok)', false, false),
    ':where(.ok)'
  );
  assert.equal(
    normalizeList(':where([attr*], .ok)', false, false),
    ':where(.ok)'
  );
  assert.equal(
    normalizeList(':where([attr|=], .ok)', false, false),
    ':where(.ok)'
  );
  assert.equal(
    normalizeList(':not([attr~], .ok)', false, false),
    ':not([attr~], .ok)'
  );
  assert.equal(
    normalizeList(':not([attr^], .ok)', false, false),
    ':not([attr^], .ok)'
  );
});

test('empty forgiving selector list does not invalidate containing rule', () => {
  assert.equal(normalizeList('.a, :is([attr~])', false, false), '.a,:is()');
  assert.equal(normalizeList(':is([attr~]), .b', false, false), ':is(),.b');
  assert.equal(
    normalizeList('.a, :where([attr~])', false, false),
    '.a,:where()'
  );
  assert.equal(
    normalizeList(':where([attr~]), .b', false, false),
    ':where(),.b'
  );
  assert.equal(
    normalizeList(':is([attr~], [attr^], [attr$])', false, false),
    ':is()'
  );
  assert.equal(
    normalizeList(':where([attr~], [attr^], [attr$])', false, false),
    ':where()'
  );
  assert.equal(
    normalizeList(':is([attr~]), :where([attr^]), .target', false, false),
    ':is(),:where(),.target'
  );
  assert.equal(minify('.a, :is([attr~])'), '.a,:is(){x:y}');
  assert.equal(minify(':where([attr~]), .b'), '.b,:where(){x:y}');
  assert.equal(minify(':is([attr~])'), ':is(){x:y}');
  assert.equal(minify(':where([attr~])'), ':where(){x:y}');
});

test('deduplicates wide selector lists with functions in linear time', () => {
  const count = 2000;
  const items = Array.from({ length: count }, (_, i) => `:is(.item-${i})`);
  const input = items.join(',');
  const start = performance.now();
  const output = normalizeList(input, false, false);
  const elapsed = performance.now() - start;
  assert.equal(output, input);
  assert.ok(elapsed < 100, `Expected < 100ms, took ${elapsed.toFixed(1)}ms`);
});

test('preserves compound-only functional pseudos when arguments contain combinators or commas', () => {
  for (const input of [
    ':host(.a > .b)',
    ':host(.a, .b)',
    ':host-context(.a + .b)',
    ':slotted(.a ~ .b)',
  ]) {
    assert.equal(normalizeList(input, false, false), input, input);
  }
});

test('normalizes functional pseudo arguments in a single pass without multi-pass trivia rescans', () => {
  const input = ':not(h1 /**/ p, div /* c1 */ > /* c2 */ span, .a + .b)';
  assert.equal(normalizeList(input, false, false), ':not(h1 p,div>span,.a+.b)');
  const repeated = `:not(${Array.from({ length: 500 }, (_, i) => `div /* ${i} */ > /* ${i} */ .item-${i}`).join(',')})`;
  const start = performance.now();
  const output = normalizeList(repeated, false, false);
  const elapsed = performance.now() - start;
  assert.ok(output.startsWith(':not('));
  assert.ok(elapsed < 100, `Expected < 100ms, took ${elapsed.toFixed(1)}ms`);
});

test('normalizes :dir() argument by trimming whitespace and preserving important comments', () => {
  assert.equal(normalizeList(':dir(  ltr  )', false, false), ':dir(ltr)');
  assert.equal(normalizeList(':dir( rtl )', false, false), ':dir(rtl)');
  assert.equal(
    normalizeList(':dir( /*! preserved */ ltr )', false, false),
    ':dir(/*! preserved */ltr)'
  );
  assert.equal(
    normalizeList(':dir( ltr /*! preserved */ )', false, false),
    ':dir(ltr/*! preserved */)'
  );
  assert.equal(
    normalizeList(':dir( /* ordinary */ ltr )', false, false),
    ':dir(ltr)'
  );
});

test('preserves invalid :dir() syntax without modification', () => {
  for (const input of [
    ':dir()',
    ':dir(   )',
    ':dir(ltr, rtl)',
    ':dir(ltr rtl)',
    ':dir("ltr")',
    ':dir(123)',
    ':dir(ltr > rtl)',
  ]) {
    assert.equal(normalizeList(input, false, false), input, input);
  }
});

test('calculates pseudo-class specificity for :dir()', () => {
  assert.equal(specificityOf(':dir(ltr)'), '0,1,0');
  assert.equal(specificityOf('article.item:dir(rtl)'), '0,2,1');
});

test('normalizes :lang() arguments with whitespace trimming, unquoting, and deduplication', () => {
  assert.equal(normalizeList(':lang( en , fr )', false, false), ':lang(en,fr)');
  assert.equal(
    normalizeList(':lang("en", \'fr\')', false, false),
    ':lang(en,fr)'
  );
  assert.equal(normalizeList(':lang("zh-*")', false, false), ':lang("zh-*")');
  assert.equal(normalizeList(':lang(en, en)', false, false), ':lang(en)');
  assert.equal(normalizeList(':lang(en, "en")', false, false), ':lang(en)');
  assert.equal(
    normalizeList(':lang(en, fr, en)', false, false),
    ':lang(en,fr)'
  );
  assert.equal(
    normalizeList(':lang( /*! preserved */ en , "fr" )', false, false),
    ':lang(/*! preserved */en,fr)'
  );
});

test('preserves invalid :lang() argument lists without modification', () => {
  for (const input of [
    ':lang()',
    ':lang(   )',
    ':lang(,)',
    ':lang(,en)',
    ':lang(en,)',
    ':lang(en,,fr)',
    ':lang(en fr)',
    ':lang(123)',
    ':lang(en > fr)',
  ]) {
    assert.equal(normalizeList(input, false, false), input, input);
  }
});

test('calculates pseudo-class specificity for :lang()', () => {
  assert.equal(specificityOf(':lang(en)'), '0,1,0');
  assert.equal(specificityOf(':lang(en, fr)'), '0,1,0');
  assert.equal(specificityOf('div.card:lang("zh-*")'), '0,2,1');
});

test('normalizes wide :lang() argument lists in linear time', () => {
  const count = 1000;
  const items = Array.from({ length: count }, (_, i) => ` "lang-${i}" `);
  const input = `:lang(${items.join(',')})`;
  const start = performance.now();
  const output = normalizeList(input, false, false);
  const elapsed = performance.now() - start;
  assert.ok(output.startsWith(':lang(lang-0,lang-1,'));
  assert.ok(elapsed < 100, `Expected < 100ms, took ${elapsed.toFixed(1)}ms`);
});

test('normalizes :nth-col() and :nth-last-col() An+B formulas', () => {
  assert.equal(
    normalizeList(':nth-col(2n + 1)', false, false),
    ':nth-col(odd)'
  );
  assert.equal(normalizeList(':nth-col(even)', false, false), ':nth-col(2n)');
  assert.equal(
    normalizeList(':nth-last-col(2n + 1)', false, false),
    ':nth-last-col(odd)'
  );
  assert.equal(
    normalizeList(':nth-last-col(even)', false, false),
    ':nth-last-col(2n)'
  );
});

test('rejects of clauses in :nth-col() and :nth-last-col() preserving exact source', () => {
  for (const input of [
    ':nth-col(1 of .a)',
    ':nth-col(even of div)',
    ':nth-last-col(1 of .a)',
    ':nth-last-col(2n of span)',
  ]) {
    assert.equal(normalizeList(input, false, false), input, input);
  }
});

test('does not convert :nth-col(1) or :nth-last-col(1) to nonexistent first/last-col pseudos', () => {
  assert.equal(normalizeList(':nth-col(1)', false, false), ':nth-col(1)');
  assert.equal(
    normalizeList(':nth-last-col(1)', false, false),
    ':nth-last-col(1)'
  );
});

test('calculates pseudo-class specificity for :nth-col() and :nth-last-col()', () => {
  assert.equal(specificityOf(':nth-col(odd)'), '0,1,0');
  assert.equal(specificityOf('table.data:nth-last-col(2n)'), '0,2,1');
});

test('normalizes ::part() arguments with whitespace compression and comment preservation', () => {
  assert.equal(
    normalizeList('::part(  tab   active  )', false, false),
    '::part(tab active)'
  );
  assert.equal(normalizeList('::part( tab )', false, false), '::part(tab)');
  assert.equal(
    normalizeList('::part( /*! preserved */ tab active )', false, false),
    '::part(/*! preserved */tab active)'
  );
  assert.equal(
    normalizeList('::part( tab /*! preserved */ active )', false, false),
    '::part(tab/*! preserved */ active)'
  );
  assert.equal(
    normalizeList('::part( /* ordinary */ tab active )', false, false),
    '::part(tab active)'
  );
});

test('preserves invalid ::part() syntax without modification', () => {
  for (const input of [
    '::part()',
    '::part(   )',
    '::part(123)',
    '::part("tab")',
    '::part(tab, active)',
    '::part(.tab)',
    '::part(tab > active)',
  ]) {
    assert.equal(normalizeList(input, false, false), input, input);
  }
});

test('calculates element specificity for ::part() without adding pseudo-class specificity', () => {
  assert.equal(specificityOf('::part(tab)'), '0,0,1');
  assert.equal(specificityOf('::part(tab active)'), '0,0,1');
  assert.equal(specificityOf('div.card::part(tab)'), '0,1,2');
  assert.equal(specificityOf('#main::part(tab active)'), '1,0,1');
});

test('normalizes wide ::part() argument lists in linear time', () => {
  const count = 1000;
  const items = Array.from({ length: count }, (_, i) => `part-${i}`);
  const input = `::part( ${items.join('   ')} )`;
  const start = performance.now();
  const output = normalizeList(input, false, false);
  const elapsed = performance.now() - start;
  assert.ok(output.startsWith('::part(part-0 part-1 '));
  assert.ok(elapsed < 100, `Expected < 100ms, took ${elapsed.toFixed(1)}ms`);
});

test('normalizes ::highlight() argument by trimming whitespace and preserving comments', () => {
  assert.equal(
    normalizeList('::highlight(  search-result  )', false, false),
    '::highlight(search-result)'
  );
  assert.equal(
    normalizeList(
      '::highlight( /*! preserved */ search-result )',
      false,
      false
    ),
    '::highlight(/*! preserved */search-result)'
  );
  assert.equal(
    normalizeList('::highlight( /* ordinary */ search-result )', false, false),
    '::highlight(search-result)'
  );
});

test('preserves invalid ::highlight() syntax without modification', () => {
  for (const input of [
    '::highlight()',
    '::highlight(   )',
    '::highlight(a b)',
    '::highlight("search-result")',
    '::highlight(123)',
    '::highlight(a, b)',
  ]) {
    assert.equal(normalizeList(input, false, false), input, input);
  }
});

test('calculates element specificity for ::highlight()', () => {
  assert.equal(specificityOf('::highlight(search-result)'), '0,0,1');
  assert.equal(specificityOf('p::highlight(search-result)'), '0,0,2');
});

test('normalizes ::view-transition-*() arguments by trimming whitespace and preserving comments', () => {
  assert.equal(
    normalizeList('::view-transition-old(  header  )', false, false),
    '::view-transition-old(header)'
  );
  assert.equal(
    normalizeList('::view-transition-new(  *  )', false, false),
    '::view-transition-new(*)'
  );
  assert.equal(
    normalizeList('::view-transition-group( root )', false, false),
    '::view-transition-group(root)'
  );
  assert.equal(
    normalizeList('::view-transition-image-pair( banner )', false, false),
    '::view-transition-image-pair(banner)'
  );
  assert.equal(
    normalizeList('::view-transition-group-children( card )', false, false),
    '::view-transition-group-children(card)'
  );
  assert.equal(
    normalizeList(
      '::view-transition-old( /*! preserved */ header )',
      false,
      false
    ),
    '::view-transition-old(/*! preserved */header)'
  );
  assert.equal(
    normalizeList('::view-transition-new( /* ordinary */ * )', false, false),
    '::view-transition-new(*)'
  );
});

test('preserves invalid ::view-transition-*() syntax without modification', () => {
  for (const input of [
    '::view-transition-old()',
    '::view-transition-new(   )',
    '::view-transition-group(header banner)',
    '::view-transition-image-pair("header")',
    '::view-transition-old(123)',
    '::view-transition-new(* *)',
  ]) {
    assert.equal(normalizeList(input, false, false), input, input);
  }
});

test('calculates element specificity for ::view-transition-*()', () => {
  assert.equal(specificityOf('::view-transition-old(header)'), '0,0,1');
  assert.equal(specificityOf('::view-transition-new(*)'), '0,0,1');
  assert.equal(specificityOf('html::view-transition-group(root)'), '0,0,2');
});

test('normalizes :state() argument by trimming whitespace and preserving comments', () => {
  assert.equal(
    normalizeList(':state(  checked  )', false, false),
    ':state(checked)'
  );
  assert.equal(
    normalizeList(':state( /*! preserved */ checked )', false, false),
    ':state(/*! preserved */checked)'
  );
  assert.equal(
    normalizeList(':state( /* ordinary */ checked )', false, false),
    ':state(checked)'
  );
});

test('preserves invalid :state() syntax without modification', () => {
  for (const input of [
    ':state()',
    ':state(   )',
    ':state(checked open)',
    ':state("checked")',
    ':state(123)',
    ':state(checked, open)',
  ]) {
    assert.equal(normalizeList(input, false, false), input, input);
  }
});

test('calculates pseudo-class specificity for :state()', () => {
  assert.equal(specificityOf(':state(checked)'), '0,1,0');
  assert.equal(specificityOf('button:state(checked)'), '0,1,1');
  assert.equal(specificityOf('form.login button:state(checked)'), '0,2,2');
});

test('calculates specificity for ::slotted() without double-counting pseudo-class specificity', () => {
  assert.equal(specificityOf('::slotted(span)'), '0,0,2');
  assert.equal(specificityOf('::slotted(.a)'), '0,1,1');
  assert.equal(specificityOf('slot::slotted(div.card)'), '0,1,3');
});
