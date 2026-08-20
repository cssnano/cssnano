'use strict';
const assert = require('node:assert/strict');
const postcss = require('postcss');
const cssnano = require('../src/index.js');

const processor = postcss([cssnano()]);

function processCss(fixture, expected, options = { from: undefined }) {
  return async () => {
    const { css } = await processor.process(fixture, options);
    assert.strictEqual(css, expected);
  };
}
module.exports = processCss;
module.exports.passthrough = function (fixture, options = { from: undefined }) {
  return processCss(fixture, fixture, options);
};
