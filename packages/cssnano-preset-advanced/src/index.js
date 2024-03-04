'use strict';
const defaultPreset = require('cssnano-preset-default');
const postcssDiscardUnused = require('postcss-discard-unused');
const postcssMergeIdents = require('postcss-merge-idents');
const postcssReduceIdents = require('postcss-reduce-idents');
const postcssZindex = require('postcss-zindex');
const autoprefixer = require('autoprefixer');

/**
 * @template {object | void} [OptionsExtends=void]
 * @typedef {false | OptionsExtends & {exclude?: true}} SimpleOptions
 */

/**
 * @typedef {object} AdvancedOptions
 * @property {autoprefixer.Options} [autoprefixer]
 * @property {SimpleOptions<import('postcss-discard-unused').Options>} [discardUnused]
 * @property {SimpleOptions} [mergeIdents]
 * @property {SimpleOptions<import('postcss-reduce-idents').Options>} [reduceIdents]
 * @property {SimpleOptions<import('postcss-zindex').Options>} [zindex]
 */

/**
 * @typedef {defaultPreset.Options & AdvancedOptions} Options
 */

/** @type {AdvancedOptions} */
const defaultOpts = {
  autoprefixer: {
    add: false,
  },
};

/**
 * Advanced optimisations for cssnano; may or may not break your CSS!
 *
 * @param {Options} opts
 * @returns {{ plugins: [import('postcss').PluginCreator<any>, Options[keyof Options]][] }}
 */
function advancedPreset(opts = {}) {
  const options = Object.assign({}, defaultOpts, opts);

  /** @type {ReturnType<typeof advancedPreset>["plugins"]} **/
  const plugins = [
    ...defaultPreset(options).plugins,
    [autoprefixer, options.autoprefixer],
    [postcssDiscardUnused, options.discardUnused],
    [postcssMergeIdents, options.mergeIdents],
    [postcssReduceIdents, options.reduceIdents],
    [postcssZindex, options.zindex],
  ];

  return { plugins };
}

module.exports = advancedPreset;
