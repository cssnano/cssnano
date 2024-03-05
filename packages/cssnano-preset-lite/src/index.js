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

/**
 * @param {[import('postcss').PluginCreator<any>, keyof LiteOptions][]} plugins
 * @param {Parameters<typeof litePreset>[0]} opts
 * @returns {ReturnType<typeof litePreset>["plugins"]}
 */
function configurePlugins(plugins, opts = {}) {
  const defaults = /** @type {LiteOptions} */ ({});

  // Merge option properties for each plugin
  return plugins.map(([plugin, opt]) => {
    const defaultProps = defaults[opt] ?? {};
    const presetProps = opts[opt] ?? {};

    return [
      plugin,
      presetProps !== false
        ? { ...defaultProps, ...presetProps }
        : { exclude: true },
    ];
  });
}

/**
 * Safe and minimum transformation with just removing whitespaces, line breaks and comments
 *
 * @param {LiteOptions} opts
 * @returns {{ plugins: [import('postcss').PluginCreator<any>, LiteOptions[keyof LiteOptions]][] }}
 */
function litePreset(opts = {}) {
  return {
    plugins: configurePlugins(
      [
        [postcssDiscardComments, 'discardComments'],
        [postcssNormalizeWhitespace, 'normalizeWhitespace'],
        [postcssDiscardEmpty, 'discardEmpty'],
        [rawCache, 'rawCache'],
      ],
      opts
    ),
  };
}

module.exports = litePreset;
