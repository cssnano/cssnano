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
