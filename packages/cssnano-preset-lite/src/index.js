'use strict';
const postcssDiscardComments = require('postcss-discard-comments');
const postcssNormalizeWhitespace = require('postcss-normalize-whitespace');
const postcssDiscardEmpty = require('postcss-discard-empty');
const { rawCache } = require('cssnano-utils');

/**
 * @template {object | void} [OptionsExtends=void]
 * @typedef {false | OptionsExtends & {exclude?: true}} SimpleOptions
 */

/**
 * @typedef {object} LiteOptions
 * @property {SimpleOptions<import('postcss-discard-comments').Options>} [discardComments]
 * @property {SimpleOptions} [normalizeWhitespace]
 * @property {SimpleOptions} [discardEmpty]
 * @property {SimpleOptions} [rawCache]
 */

/** @satisfies {LiteOptions} */
const defaultOpts = {};

/**
 * Safe and minimum transformation with just removing whitespaces, line breaks and comments
 *
 * @param {LiteOptions} opts
 * @returns {{ plugins: [import('postcss').PluginCreator<any>, LiteOptions[keyof LiteOptions]][] }}
 */
function litePreset(opts = {}) {
  const options = Object.assign({}, defaultOpts, opts);

  /** @satisfies {ReturnType<typeof litePreset>["plugins"]} */
  const plugins = [
    [postcssDiscardComments, options.discardComments],
    [postcssNormalizeWhitespace, options.normalizeWhitespace],
    [postcssDiscardEmpty, options.discardEmpty],
    [rawCache, options.rawCache],
  ];

  return { plugins };
}

module.exports = litePreset;
