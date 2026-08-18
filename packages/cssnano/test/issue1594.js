'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const postcss = require('postcss');
const preset = require('cssnano-preset-default');
const nano = require('../src/index.js');

const fixture = `
@layer components {
  .O82 { display: flex; }
}
@layer components {
  .tK5 { border: 0; }
}
@layer components {
  .tK1 { font-size: inherit; }
}
`;

const expected =
  '@layer components{.O82{display:flex}.tK5{border:0}.tK1{font-size:inherit}}';

test('should discard empty layers after merging layers', () => {
  const processor = postcss([
    nano({
      preset: preset(),
    }),
  ]);

  return processor
    .process(fixture, { from: undefined })
    .then((result) => assert.strictEqual(result.css, expected));
});
