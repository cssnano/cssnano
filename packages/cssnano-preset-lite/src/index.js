'use strict';
const postcssDiscardComments = require('postcss-discard-comments');
const postcssNormalizeWhitespace = require('postcss-normalize-whitespace');
const postcssDiscardEmpty = require('postcss-discard-empty');
const { rawCache } = require('cssnano-utils');

/** @typedef {false | { exclude?: true} }SimpleOptions */
/** @typedef {{discardComments?: false | import('postcss-discard-comments').Options & { exclude?: true},
normalizeWhitespace?: SimpleOptions, 
discardEmpty?: SimpleOptions, 
rawCache?: SimpleOptions}} Options */

const defaultOpts = {};
/**
 * @param {Options} opts
 * @return {{plugins: [import('postcss').PluginCreator<any>, false | Record<string, any> | undefined][]}}
 */
function defaultPreset(opts = {}) {
  const options = Object.assign({}, defaultOpts, opts);
  /** @type {[import('postcss').PluginCreator<any>, false | Record<string, any> | undefined][]} **/
  const plugins = [
    [postcssDiscardComments, options.discardComments],
    [postcssNormalizeWhitespace, options.normalizeWhitespace],
    [postcssDiscardEmpty, options.discardEmpty],
    [rawCache, options.rawCache],
  ];

  return { plugins };
}

module.exports = defaultPreset;
