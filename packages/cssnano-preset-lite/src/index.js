'use strict';
const postcssDiscardComments = require('postcss-discard-comments');
const postcssNormalizeWhitespace = require('postcss-normalize-whitespace');
const postcssDiscardEmpty = require('postcss-discard-empty');
const { rawCache } = require('cssnano-utils');

const defaultOpts = {};

module.exports = function defaultPreset(opts = {}) {
  const options = Object.assign({}, defaultOpts, opts);

  const plugins = [
    [postcssDiscardComments, options.discardComments],
    [postcssNormalizeWhitespace, options.normalizeWhitespace],
    [postcssDiscardEmpty, options.discardEmpty],
    [rawCache, options.rawCache],
  ];

  return { plugins };
};
