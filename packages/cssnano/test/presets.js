'use strict';
const { test } = require('uvu');
const assert = require('uvu/assert');
const postcss = require('postcss');
const advancedPreset = require('cssnano-preset-advanced');
const defaultPreset = require('cssnano-preset-default');
const cssnano = require('..');

test('should accept an invoked preset', () => {
  const preset = defaultPreset({ normalizeCharset: { add: true } });

  return postcss([cssnano({ preset })])
    .process(`h1{content:"©"}`, { from: undefined })
    .then((result) => {
      assert.is(result.css, `@charset "utf-8";h1{content:"©"}`);
    });
});

test('should accept a non-invoked preset', () => {
  const preset = [defaultPreset, { normalizeCharset: { add: true } }];

  return postcss([cssnano({ preset })])
    .process(`h1{content:"©"}`, { from: undefined })
    .then((result) => {
      assert.is(result.css, `@charset "utf-8";h1{content:"©"}`);
    });
});

test('should accept a default preset string', () => {
  const preset = ['default', { normalizeCharset: { add: true } }];

  return postcss([cssnano({ preset })])
    .process(`h1{content:"©"}`, { from: undefined })
    .then((result) => {
      assert.is(result.css, `@charset "utf-8";h1{content:"©"}`);
    });
});

test('should accept an invoked preset other than default', () => {
  const preset = advancedPreset({ zindex: { startIndex: 15 } });

  return postcss([cssnano({ preset })])
    .process(`h1{z-index:10}`, { from: undefined })
    .then((result) => {
      assert.is(result.css, `h1{z-index:15}`);
    });
});

test('should accept a preset string other than default', () => {
  const preset = 'cssnano-preset-advanced';

  return postcss([cssnano({ preset })])
    .process(`h1{z-index:10}`, { from: undefined })
    .then((result) => {
      assert.is(result.css, `h1{z-index:1}`);
    });
});

test('should accept a preset string other than default, with options', () => {
  const preset = ['cssnano-preset-advanced', { zindex: { startIndex: 15 } }];

  return postcss([cssnano({ preset })])
    .process(`h1{z-index:10}`, { from: undefined })
    .then((result) => {
      assert.is(result.css, `h1{z-index:15}`);
    });
});

test('should accept a preset string other than default (sugar syntax)', () => {
  const preset = ['advanced', { zindex: { startIndex: 15 } }];

  return postcss([cssnano({ preset })])
    .process(`h1{z-index:10}`, { from: undefined })
    .then((result) => {
      assert.is(result.css, `h1{z-index:15}`);
    });
});

test('should be able to exclude plugins', () => {
  const preset = ['advanced', { zindex: false }];

  return postcss([cssnano({ preset })])
    .process(`h1{z-index:10}`, { from: undefined })
    .then((result) => {
      assert.is(result.css, `h1{z-index:10}`);
    });
});

test('should be able to include plugins', () => {
  const preset = ['advanced', { zindex: true }];

  return postcss([cssnano({ preset })])
    .process(`h1{z-index:10}`, { from: undefined })
    .then((result) => {
      assert.is(result.css, `h1{z-index:1}`);
    });
});

test('should be able to exclude plugins (exclude syntax)', () => {
  const preset = ['advanced', { zindex: { startIndex: 15, exclude: true } }];

  return postcss([cssnano({ preset })])
    .process(`h1{z-index:10}`, { from: undefined })
    .then((result) => {
      assert.is(result.css, `h1{z-index:10}`);
    });
});

test('should error on a bad preset', async () => {
  try {
    await postcss([cssnano({ preset: 'avanced' })])
      .process('h1{}', { from: undefined })
      .then(() => {});
    assert.unreachable();
  } catch (error) {
    assert.ok(error);
  }
});
test.run();
