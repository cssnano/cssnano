import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import {
  usePostCSSPlugin,
  processCSSFactory,
} from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

test(
  'should prefer double quotes by default',
  passthroughCSS(`p:after{content:""}`)
);

test('should preserve EOF-terminated strings byte-for-byte', async () => {
  const values = ["'abc", "'abc\\'", "'abc\\", "'abc\\27"];
  for (const value of values) {
    const decl = postcss.decl({ prop: 'content', value });
    const root = postcss.root({ nodes: [decl] });
    await postcss([plugin()]).process(root, { from: undefined });
    assert.equal(decl.value, value);
  }
});

test('should preserve EOF-terminated strings in selectors and at-rule params', async () => {
  const rule = postcss.rule({ selector: String.raw`[data-value='abc` });
  const atRule = postcss.atRule({ name: 'media', params: String.raw`'abc` });
  const root = postcss.root({ nodes: [rule, atRule] });
  await postcss([plugin()]).process(root, { from: undefined });
  assert.equal(rule.selector, String.raw`[data-value='abc`);
  assert.equal(atRule.params, String.raw`'abc`);
});

test('should preserve newline-terminated strings in all CSS contexts', async () => {
  const selector = String.raw`[data-value='abc` + '\n' + ']';
  const rule = postcss.rule({ selector });
  const atRule = postcss.atRule({ name: 'supports', params: selector });
  const decl = postcss.decl({ prop: 'content', value: selector });
  const root = postcss.root({ nodes: [rule, atRule, decl] });
  await postcss([plugin()]).process(root, { from: undefined });
  assert.equal(rule.selector, selector);
  assert.equal(atRule.params, selector);
  assert.equal(decl.value, selector);
});

test('should distinguish one and two trailing backslashes before a quote', async () => {
  const eofTerminated = String.raw`'one\'`;
  const closed = String.raw`'two\\'`;
  const root = postcss.root({
    nodes: [
      postcss.decl({ prop: 'content', value: eofTerminated }),
      postcss.decl({ prop: 'content', value: closed }),
    ],
  });
  await postcss([plugin()]).process(root, { from: undefined });
  assert.equal(root.first.value, eofTerminated);
  assert.equal(root.last.value, String.raw`"two\\"`);
});

test('should normalize escaped newlines and hexadecimal quote escapes', async () => {
  const value = String.raw`'line\
  quote \27 '`;
  const decl = postcss.decl({ prop: 'content', value });
  const root = postcss.root({ nodes: [decl] });
  await postcss([plugin()]).process(root, { from: undefined });
  assert.equal(decl.value, '"line  quote \\27 "');
});

describe('Transform', () => {
  test(
    'should transform single quotes to double quotes by default',
    processCSS(`p:after{content:''}`, `p:after{content:""}`)
  );

  test(
    'should transform double quotes to single quotes via an option',
    processCSS(`p:after{content:""}`, `p:after{content:''}`, {
      preferredQuote: 'single',
    })
  );
});

describe('Keep', () => {
  test(
    'should keep single quotes inside a double quoted string intact',
    passthroughCSS(`p:after{content:"'string' is intact"}`)
  );

  test(
    'should keep double quotes inside a single quoted string intact',
    passthroughCSS(`p:after{content:'"string" is intact'}`)
  );
});

describe('Transform', () => {
  test(
    'should transform escaped single quotation marks if possible',
    processCSS(
      `p:after{content:'\\'string\\' is intact'}`,
      `p:after{content:"'string' is intact"}`
    )
  );

  test(
    'should transform escaped double quotation marks if possible',
    processCSS(
      `p:after{content:"\\"string\\" is intact"}`,
      `p:after{content:'"string" is intact'}`
    )
  );

  test(
    'should not transform quotation marks when mixed',
    passthroughCSS(`p:after{content:"\\"string\\" is 'intact'"}`)
  );

  test(
    'should not transform quotation marks when mixed (2)',
    passthroughCSS(`p:after{content:'"string" is \\'intact\\''}`)
  );

  test(
    'should transform escaped single quotation marks when mixed',
    processCSS(
      `p:after{content:'\\'string\\' is \\"intact\\"'}`,
      `p:after{content:'\\'string\\' is "intact"'}`
    )
  );

  test(
    'should transform escaped double quotation marks when mixed',
    processCSS(
      `p:after{content:"\\'string\\' is \\"intact\\""}`,
      `p:after{content:"'string' is \\"intact\\""}`
    )
  );
});

test(
  'should work with the attr function',
  processCSS(
    `p:after{content:'(' attr(href) ')'}`,
    `p:after{content:"(" attr(href) ")"}`
  )
);

test(
  'should preserve escaped whitespace and quote spelling when needed',
  passthroughCSS(`p:after{content:"a \\"quoted\\" 'value'"}`)
);

test(
  'should normalize multiple strings across CSS contexts',
  processCSS(
    `[a='one\\ two'][b='three']{content:'four' "five";background:url('six') var(--x, 'seven') /*eight*/ 'nine'} @media 'ten' "eleven"{a{content:'twelve'}}`,
    `[a="one\\ two"][b="three"]{content:"four" "five";background:url("six") var(--x, "seven") /*eight*/ "nine"} @media "ten" "eleven"{a{content:"twelve"}}`
  )
);

test('should normalize parsed declaration raw values', async () => {
  const decl = postcss.decl({ prop: 'content', value: "'value'" });
  decl.raws.value = { raw: "'value'", value: "'value'" };
  const root = postcss.root({ nodes: [decl] });
  await postcss([plugin()]).process(root, { from: undefined });
  assert.equal(decl.value, '"value"');
  assert.deepEqual(decl.raws.value, { raw: '"value"', value: '"value"' });
});

test('should ignore stale declaration raw values', async () => {
  const decl = postcss.decl({ prop: 'content', value: "'original'" });
  decl.raws.value = { raw: "'stale'", value: "'original'" };
  const preceding = {
    postcssPlugin: 'change-value',
    Once() {
      decl.value = "'changed'";
    },
  };
  const root = postcss.root({ nodes: [decl] });
  await postcss([preceding, plugin()]).process(root, { from: undefined });
  assert.equal(decl.value, '"changed"');
  assert.deepEqual(decl.raws.value, { raw: '"changed"', value: '"changed"' });
});

test('should normalize declaration raw values with surrounding formatting', async () => {
  const decl = postcss.decl({ prop: 'content', value: "'value'" });
  decl.raws.value = { raw: "  'value'  ", value: "'value'" };
  const root = postcss.root({ nodes: [decl] });
  await postcss([plugin()]).process(root, { from: undefined });
  assert.equal(decl.value, '  "value"  ');
  assert.deepEqual(decl.raws.value, {
    raw: '  "value"  ',
    value: '  "value"  ',
  });
});

test('should normalize a value with many string spans', async () => {
  const input = Array.from({ length: 1000 }, (_, index) => `'${index}'`).join(
    ' '
  );
  const expected = Array.from(
    { length: 1000 },
    (_, index) => `"${index}"`
  ).join(' ');
  const result = await processCSS(
    `a{content:${input}}`,
    `a{content:${expected}}`
  )();
  assert.equal(result.css, `a{content:${expected}}`);
});

/*
 * The whitespace here is kept because it might influence the design
 * e.g. through `white-space: pre;`
 */

test(
  'should join multiple line strings',
  processCSS(
    `p:after{content:" > this is some really\\
                     long text which is broken\\
                     over several lines."}`,
    `p:after{content:" > this is some really                     long text which is broken                     over several lines."}`
  )
);

describe('Work', () => {
  test(
    'should work with quotes',
    processCSS(`q{quotes:'«' "»"}`, `q{quotes:"«" "»"}`)
  );

  test(
    'should work with language overrides',
    processCSS(
      `p{font-language-override:'DAN'}`,
      `p{font-language-override:"DAN"}`
    )
  );

  test(
    'should work with css grids',
    processCSS(
      `p{grid-template:'a a a' "b b b"}`,
      `p{grid-template:"a a a" "b b b"}`
    )
  );

  test(
    'should work with css grids (2)',
    processCSS(
      `p{grid-template-areas:'a a a' "b b b"}`,
      `p{grid-template-areas:"a a a" "b b b"}`
    )
  );

  test(
    'should work with list styles',
    processCSS(`ul{list-style-type:'-'}`, `ul{list-style-type:"-"}`)
  );

  test(
    'should work with text emphasis styles',
    processCSS(
      `p{text-emphasis-style:'\\25B2'}`,
      `p{text-emphasis-style:"\\25B2"}`
    )
  );

  test(
    'should work with text overflow',
    processCSS(`p{text-overflow:'…' '…'}`, `p{text-overflow:"…" "…"}`)
  );

  test(
    'should work with font',
    processCSS(`p{font:1em/1.5 'slab serif'}`, `p{font:1em/1.5 "slab serif"}`)
  );

  test(
    'should work with font family',
    processCSS(`p{font-family:'slab serif'}`, `p{font-family:"slab serif"}`)
  );

  test(
    'should work with font feature settings',
    processCSS(
      `p{font-feature-settings:'frac'}`,
      `p{font-feature-settings:"frac"}`
    )
  );

  test(
    'should work with web fonts',
    processCSS(
      `@font-face{font-family:'slab serif';src:local('slab serif'),url(slab.ttf) format('truetype')}`,
      `@font-face{font-family:"slab serif";src:local("slab serif"),url(slab.ttf) format("truetype")}`
      // {discardUnused: false}
    )
  );
});

describe('Remove', () => {
  test(
    'should remove unnecessary backslashes in urls',
    processCSS(
      `p{background:url('http://example.com/foo\\'bar.jpg')}`,
      `p{background:url("http://example.com/foo'bar.jpg")}`
      // {normalizeUrl: false}
    )
  );

  test(
    'should remove unnecessary backslashes in urls #1',
    processCSS(
      `p{background:url("http://example.com/foo\\"bar.jpg")}`,
      `p{background:url('http://example.com/foo"bar.jpg')}`
      // {normalizeUrl: false}
    )
  );
});

test(
  'should work in attribute selectors',
  processCSS(
    `[rel='external link']{color:#00f}`,
    `[rel="external link"]{color:#00f}`
  )
);

describe('Change', () => {
  test(
    'should change strings (1)',
    processCSS(
      `[a="escaped quotes \\" h1, h1, h1 \\" h1, h1, h1"]{color:#00f}`,
      `[a='escaped quotes " h1, h1, h1 " h1, h1, h1']{color:#00f}`
    )
  );

  test(
    'should change strings (2)',
    processCSS(
      `[a='escaped quotes \\' h1, h1, h1 \\' h1, h1, h1']{color:#00f}`,
      `[a="escaped quotes ' h1, h1, h1 ' h1, h1, h1"]{color:#00f}`
    )
  );
});

test(
  'should work for @import',
  processCSS(`@import url('foo.css')`, `@import url("foo.css")`)
);

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));

describe('Work', () => {
  test(
    'should work for grid-columsn',
    passthroughCSS(`div{grid-column: span 2;}`)
  );

  test(
    'should work for grid-columsn #2',
    passthroughCSS(`div{grid-column: span 2 / 1;}`)
  );

  test(
    'should work for grid-columsn #3',
    passthroughCSS(`div{grid-column: "span 2";}`)
  );

  test('should work for columns', passthroughCSS(`div{columns: 2 auto;}`));
});
