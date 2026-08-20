'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const postcss = require('postcss');
const nano = require('../src/index.js');

test('cssnano can be used as a configured plugin with postcss().use()', async () => {
  const { css } = await postcss()
    .use(nano())
    .process('h1 { color: #ffffff }', { from: undefined });

  assert.strictEqual(css, 'h1{color:#fff}');
});

test('cssnano can be used as a configured plugin in a PostCSS plugin array', async () => {
  const { css } = await postcss([nano()]).process('h1 { color: #ffffff }', {
    from: undefined,
  });

  assert.strictEqual(css, 'h1{color:#fff}');
});

test('cssnano can be used as a plugin creator in a PostCSS plugin array', async () => {
  const { css } = await postcss([nano]).process('h1 { color: #ffffff }', {
    from: undefined,
  });

  assert.strictEqual(css, 'h1{color:#fff}');
});

test('cssnano can be used as a plugin creator directly', async () => {
  const { css } = await postcss(nano).process('h1 { color: #ffffff }', {
    from: undefined,
  });

  assert.strictEqual(css, 'h1{color:#fff}');
});

test('cssnano can be used as a plugin creator with postcss().use()', async () => {
  const { css } = await postcss()
    .use(nano)
    .process('h1 { color: #ffffff }', { from: undefined });

  assert.strictEqual(css, 'h1{color:#fff}');
});

test('should work with sourcemaps', async () => {
  const { css } = await postcss([nano]).process('h1{z-index:1}', {
    from: undefined,
    map: { inline: true },
  });
  assert.strictEqual(
    /sourceMappingURL=data:application\/json;base64/.test(css),
    true
  );
});
