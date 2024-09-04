'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const postcss = require('postcss');
const preset = require('cssnano-preset-default');
const nano = require('..');

const fixture = `
.b {
  animation: opacity 0ms calc(1000ms);
}
`;

const expected = '.b{animation:opacity 0s calc(1s)}';

test('it should keep quote', () => {
  const processor = postcss([
    nano({
      preset: preset({ calc: false }),
    }),
  ]);

  return processor
    .process(fixture, { from: undefined })
    .then((r) => assert.strictEqual(r.css, expected));
});
