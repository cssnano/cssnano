'use strict';
const assert = require('uvu/assert');
const postcss = require('postcss');
const cssnano = require('..');

function processCss(fixture, expected, options = { from: undefined }) {
  return () =>
    postcss([cssnano()])
      .process(fixture, options)
      .then(({ css }) => {
        assert.is(css, expected);
      });
}
module.exports = processCss;
module.exports.passthrough = function (fixture, options = { from: undefined }) {
  return processCss(fixture, fixture, options);
};
