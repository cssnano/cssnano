'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const postcss = require('postcss');
const advancedPreset = require('cssnano-preset-advanced');
const defaultPreset = require('cssnano-preset-default');
const cssnano = require('../src/index.js');

test('should accept an invoked preset', async () => {
  const preset = defaultPreset({ normalizeCharset: { add: true } });

  const result = await postcss([cssnano({ preset })]).process(
    `h1{content:"©"}`,
    { from: undefined }
  );
  assert.strictEqual(result.css, `@charset "utf-8";h1{content:"©"}`);
});

test('should accept a non-invoked preset', async () => {
  const preset = [defaultPreset, { normalizeCharset: { add: true } }];

  const result = await postcss([cssnano({ preset })]).process(
    `h1{content:"©"}`,
    { from: undefined }
  );
  assert.strictEqual(result.css, `@charset "utf-8";h1{content:"©"}`);
});

test('should accept a default preset string', async () => {
  const preset = ['default', { normalizeCharset: { add: true } }];

  const result = await postcss([cssnano({ preset })]).process(
    `h1{content:"©"}`,
    { from: undefined }
  );
  assert.strictEqual(result.css, `@charset "utf-8";h1{content:"©"}`);
});

test('should accept an invoked preset other than default', async () => {
  const preset = advancedPreset({ zindex: { startIndex: 15 } });

  const result = await postcss([cssnano({ preset })]).process(
    `h1{z-index:10}`,
    { from: undefined }
  );
  assert.strictEqual(result.css, `h1{z-index:15}`);
});

test('should accept a preset string other than default', async () => {
  const preset = 'cssnano-preset-advanced';

  const result = await postcss([cssnano({ preset })]).process(
    `h1{z-index:10}`,
    { from: undefined }
  );
  assert.strictEqual(result.css, `h1{z-index:1}`);
});

test('should accept a preset string other than default, with options', async () => {
  const preset = ['cssnano-preset-advanced', { zindex: { startIndex: 15 } }];

  const result = await postcss([cssnano({ preset })]).process(
    `h1{z-index:10}`,
    { from: undefined }
  );
  assert.strictEqual(result.css, `h1{z-index:15}`);
});

test('should accept a preset string other than default (sugar syntax)', async () => {
  const preset = ['advanced', { zindex: { startIndex: 15 } }];

  const result = await postcss([cssnano({ preset })]).process(
    `h1{z-index:10}`,
    { from: undefined }
  );
  assert.strictEqual(result.css, `h1{z-index:15}`);
});

test('should be able to exclude plugins', async () => {
  const preset = ['advanced', { zindex: false }];

  const result = await postcss([cssnano({ preset })]).process(
    `h1{z-index:10}`,
    { from: undefined }
  );
  assert.strictEqual(result.css, `h1{z-index:10}`);
});

test('should be able to include plugins', async () => {
  const preset = ['advanced', { zindex: true }];

  const result = await postcss([cssnano({ preset })]).process(
    `h1{z-index:10}`,
    { from: undefined }
  );
  assert.strictEqual(result.css, `h1{z-index:1}`);
});

test('should be able to exclude plugins (exclude syntax)', async () => {
  const preset = ['advanced', { zindex: { startIndex: 15, exclude: true } }];

  const result = await postcss([cssnano({ preset })]).process(
    `h1{z-index:10}`,
    { from: undefined }
  );
  assert.strictEqual(result.css, `h1{z-index:10}`);
});

test('should be able to exclude pointer-events plugin', async () => {
  const result = await cssnano({
    preset: [
      'default',
      {
        reduceInitial: { ignore: ['pointer-events'] },
      },
    ],
  }).process('.selector { pointer-events: initial; }', { from: undefined });
  assert.strictEqual(result.css, '.selector{pointer-events:initial}');
});
test('should error on a bad preset', async () => {
  try {
    await postcss([cssnano({ preset: 'avanced' })]).process('h1{}', {
      from: undefined,
    });
    assert.unreachable();
  } catch (error) {
    assert.ok(error);
  }
});
