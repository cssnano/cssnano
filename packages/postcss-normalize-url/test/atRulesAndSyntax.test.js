import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import {
  usePostCSSPlugin,
  processCSSFactory,
} from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

test(
  'should pass through unclosed strings and strings with escaped quotes at EOF',
  passthroughCSS('h1{background:url("foo\\");mask:url("cat.jpg)}')
);

describe('Optimise', () => {
  test(
    'should optimise @namespace urls',
    processCSS(
      '@namespace islands url(" http://bar.yandex.ru/ui/islands");',
      '@namespace islands "http://bar.yandex.ru/ui/islands";'
    )
  );

  test(
    'should optimise @namespace urls (2)',
    processCSS(
      '@namespace islands url(http://bar.yandex.ru/ui/islands );',
      '@namespace islands "http://bar.yandex.ru/ui/islands";'
    )
  );

  test(
    'should optimise @namespace urls (3)',
    processCSS(
      '@namespace islands " http://bar.yandex.ru/ui/islands ";',
      '@namespace islands "http://bar.yandex.ru/ui/islands";'
    )
  );

  test(
    'should optimise @namespace urls (4)',
    processCSS(
      '@NAMESPACE islands " http://bar.yandex.ru/ui/islands ";',
      '@NAMESPACE islands "http://bar.yandex.ru/ui/islands";'
    )
  );

  test(
    'should preserve text following a @namespace url',
    processCSS(
      '@namespace islands url("  http://bar.yandex.ru/ui/islands  ") tail;',
      '@namespace islands "http://bar.yandex.ru/ui/islands" tail;'
    )
  );

  test(
    'should preserve text following an unquoted @namespace url',
    processCSS(
      '@namespace islands url(http://example.com) tail;',
      '@namespace islands "http://example.com" tail;'
    )
  );

  test(
    'should preserve text following a single-quoted @namespace url',
    processCSS(
      "@namespace islands url('http://example.com') tail;",
      '@namespace islands "http://example.com" tail;'
    )
  );

  test(
    'should optimise multiple @namespace urls without overlap',
    processCSS(
      '@namespace a url("  http://example.com/x  "), url("  http://example.com/y  ");',
      '@namespace a "http://example.com/x", "http://example.com/y";'
    )
  );

  test(
    'should escape double quotes in @namespace urls when converting from quoted url',
    processCSS(
      '@namespace prefix url("http://example.com/\\"test\\"");',
      '@namespace prefix "http://example.com/\\"test\\"";'
    )
  );

  test(
    'should escape double quotes in @namespace urls when converting from single-quoted url',
    processCSS("@namespace prefix url('a\"b');", '@namespace prefix "a\\"b";')
  );

  test(
    'should preserve backslashes in @namespace urls',
    processCSS(
      '@namespace prefix url("http://example.com/foo\\\\bar");',
      '@namespace prefix "http://example.com/foo\\\\bar";'
    )
  );
});

test(
  'should not normalize @document urls',
  passthroughCSS(
    '@document url(http://www.w3.org/),url-prefix(http://www.w3.org/Style/){body{font-size:2em}}'
  )
);

test(
  'should pass through escaped url function names',
  passthroughCSS('h1{background:\\75rl(foo.png)}')
);

test(
  'should pass through paths in parameters',
  passthroughCSS(
    'background: url(https://ss0.example.com/70cFuh_Q1Yn/it/u=5088,2842&fm=26&gp=0.jpg?imageView2/1/w/750/h/1334)'
  )
);

describe('Pass', () => {
  test(
    "should pass through when it doesn't find a url function",
    passthroughCSS('h1{color:black;font-weight:bold}')
  );

  test(
    'should pass through non-url empty functions',
    passthroughCSS('h1{shape-outside:circle()}')
  );

  test('should pass through empty url', passthroughCSS('h1{background:url()}'));

  test(
    'should pass through invalid url',
    passthroughCSS('h1{background:url(http://)}')
  );
});

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));

test('should pass through malformed namespace strings byte-for-byte', async () => {
  const values = ['"abc', '"abc\\'];
  const atRules = values.map((params) =>
    postcss.atRule({ name: 'namespace', params })
  );
  const root = postcss.root({ nodes: atRules });

  await postcss([plugin()]).process(root, { from: undefined });

  for (const [index, value] of values.entries()) {
    assert.equal(atRules[index].params, value);
  }
});

test('should pass through malformed and unclosed url strings byte-for-byte', async () => {
  const values = ['url("abc', 'url("abc\\', 'url("abc\n)'];
  const decls = values.map((value) =>
    postcss.decl({ prop: 'background', value })
  );
  const root = postcss.root({
    nodes: [postcss.rule({ selector: 'h1', nodes: decls })],
  });

  await postcss([plugin()]).process(root, { from: undefined });

  for (const [index, value] of values.entries()) {
    assert.equal(decls[index].value, value);
  }
});

test('should not override rule.params when rule.raws.params has stale raw representation', async () => {
  const atRule = (
    await postcss([plugin()]).process(
      '@namespace islands url("http://bar.yandex.ru/ui/islands");',
      { from: undefined }
    )
  ).root.first;
  atRule.params = 'islands url("http://example.com/fresh")';
  atRule.raws = {
    params: {
      raw: 'islands url("http://stale.com/old")',
      value: 'islands url("http://stale.com/old")',
    },
  };
  await postcss([plugin()]).process(atRule.root(), { from: undefined });
  assert.strictEqual(atRule.params, 'islands "http://example.com/fresh"');
  assert.strictEqual(
    atRule.raws.params.raw,
    'islands "http://example.com/fresh"'
  );
  assert.strictEqual(
    atRule.raws.params.value,
    'islands "http://example.com/fresh"'
  );
});

test('should bypass declarations without URLs without mutating them', async () => {
  const decl = postcss.decl({ prop: 'color', value: 'red' });
  const root = postcss.root({
    nodes: [postcss.rule({ selector: 'h1', nodes: [decl] })],
  });
  const originalRaws = decl.raws;
  await postcss([plugin()]).process(root, { from: undefined });
  assert.strictEqual(decl.value, 'red');
  assert.strictEqual(decl.raws, originalRaws);
});

describe('@import', () => {
  test(
    'should normalize @import url() to string',
    processCSS('@import url("style.css");', '@import "style.css";')
  );

  test(
    'should normalize single-quoted @import url() to string',
    processCSS("@import url('style.css');", "@import 'style.css';")
  );

  test(
    'should normalize unquoted @import url() to string',
    processCSS('@import url(style.css);', '@import "style.css";')
  );

  test(
    'should normalize relative path with dot segments in @import string',
    processCSS('@import "sub/../main.css";', '@import "main.css";')
  );

  test(
    'should normalize absolute URL and preserve trailing conditions in @import',
    processCSS(
      '@import url("https://example.com:443/font.css") layer(base);',
      '@import "https://example.com/font.css" layer(base);'
    )
  );

  test(
    'should preserve ./ for relative URL with colon in first segment in @import',
    processCSS('@import url("./foo:bar.css");', '@import "./foo:bar.css";')
  );

  test(
    'should preserve data urls in @import untouched',
    passthroughCSS('@import url("data:text/css;base64,abc");')
  );

  test(
    'should preserve comments preceding url in @import',
    processCSS(
      '@import /* comment */ url("style.css");',
      '@import /* comment */ "style.css";'
    )
  );

  test(
    'should handle uppercase @IMPORT at-rules',
    processCSS('@IMPORT url("style.css");', '@IMPORT "style.css";')
  );

  test(
    'should not transform conditions containing url() into string',
    processCSS(
      '@import url("main.css") supports(background: url("sub/../bg.png"));',
      '@import "main.css" supports(background: url(bg.png));'
    )
  );

  test(
    'should normalize multiple url expressions across conditions in @import',
    processCSS(
      '@import url("main.css") layer(layer1) supports(background: url("sub/../bg.png")) and supports(border-image: url("other/../icon.png"));',
      '@import "main.css" layer(layer1) supports(background: url(bg.png)) and supports(border-image: url(icon.png));'
    )
  );

  test(
    'should pass through empty @import string',
    passthroughCSS('@import "";')
  );

  test(
    'should pass through empty @import url',
    passthroughCSS('@import url();')
  );

  test(
    'should pass through whitespace-only @import string',
    passthroughCSS('@import " ";')
  );

  test(
    'should pass through @import with extra tokens inside url()',
    passthroughCSS('@import url("style.css" extra);')
  );

  test(
    'should pass through @import with non-url identifier parameter',
    passthroughCSS('@import not_a_url;')
  );

  test('should not override @import rule.params when rule.raws.params has stale raw representation', async () => {
    const atRule = (
      await postcss([plugin()]).process(
        '@import url("http://bar.yandex.ru/ui/islands.css");',
        { from: undefined }
      )
    ).root.first;
    atRule.params = 'url("http://example.com/fresh.css")';
    atRule.raws = {
      params: {
        raw: 'url("http://stale.com/old.css")',
        value: 'url("http://stale.com/old.css")',
      },
    };
    await postcss([plugin()]).process(atRule.root(), { from: undefined });
    assert.strictEqual(atRule.params, '"http://example.com/fresh.css"');
    assert.strictEqual(
      atRule.raws.params.raw,
      '"http://example.com/fresh.css"'
    );
    assert.strictEqual(
      atRule.raws.params.value,
      '"http://example.com/fresh.css"'
    );
  });
});

test(
  'should normalize URLs nested within image-set()',
  processCSS(
    'h1{background-image:image-set(url("sub/../cat.png") 1x, url("sub/../cat-2x.png") 2x)}',
    'h1{background-image:image-set(url(cat.png) 1x, url(cat-2x.png) 2x)}'
  )
);

describe('@supports', () => {
  test(
    'should normalize url() inside @supports condition parameters',
    processCSS(
      '@supports (background: url("sub/../bg.png")) { h1 { color: red; } }',
      '@supports (background: url(bg.png)) { h1 { color: red; } }'
    )
  );

  test(
    'should normalize src() inside @supports condition parameters',
    processCSS(
      '@supports (src: src("fonts/../font.woff2")) { h1 { color: blue; } }',
      '@supports (src: src("font.woff2")) { h1 { color: blue; } }'
    )
  );

  test('should not override @supports rule.params when rule.raws.params has stale raw representation', async () => {
    const atRule = (
      await postcss([plugin()]).process(
        '@supports (background: url("http://bar.yandex.ru/ui/islands.png")) {}',
        { from: undefined }
      )
    ).root.first;
    atRule.params = '(background: url("http://example.com/dir/../fresh.png"))';
    atRule.raws = {
      params: {
        raw: '(background: url("http://stale.com/old.png"))',
        value: '(background: url("http://stale.com/old.png"))',
      },
    };
    await postcss([plugin()]).process(atRule.root(), { from: undefined });
    assert.strictEqual(
      atRule.params,
      '(background: url(http://example.com/fresh.png))'
    );
    assert.strictEqual(
      atRule.raws.params.raw,
      '(background: url(http://example.com/fresh.png))'
    );
    assert.strictEqual(
      atRule.raws.params.value,
      '(background: url(http://example.com/fresh.png))'
    );
  });
});
