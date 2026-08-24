import postcssDiscardComments from 'postcss-discard-comments';
import postcssReduceInitial from 'postcss-reduce-initial';
import postcssMinifyGradients from 'postcss-minify-gradients';
import postcssSvgo from 'postcss-svgo';
import postcssReduceTransforms from 'postcss-reduce-transforms';
import postcssConvertValues from 'postcss-convert-values';
import postcssCalc from 'postcss-calc';
import postcssColormin from 'postcss-colormin';
import postcssOrderedValues from 'postcss-ordered-values';
import postcssMinifySelectors from 'postcss-minify-selectors';
import postcssMinifyParams from 'postcss-minify-params';
import postcssNormalizeCharset from 'postcss-normalize-charset';
import postcssMinifyFontValues from 'postcss-minify-font-values';
import postcssNormalizeUrl from 'postcss-normalize-url';
import postcssMergeLonghand from 'postcss-merge-longhand';
import postcssDiscardDuplicates from 'postcss-discard-duplicates';
import postcssDiscardOverridden from 'postcss-discard-overridden';
import postcssNormalizeRepeatStyle from 'postcss-normalize-repeat-style';
import postcssMergeRules from 'postcss-merge-rules';
import postcssDiscardEmpty from 'postcss-discard-empty';
import postcssUniqueSelectors from 'postcss-unique-selectors';
import postcssNormalizeString from 'postcss-normalize-string';
import postcssNormalizePositions from 'postcss-normalize-positions';
import postcssNormalizeWhitespace from 'postcss-normalize-whitespace';
import postcssNormalizeUnicode from 'postcss-normalize-unicode';
import postcssNormalizeDisplayValues from 'postcss-normalize-display-values';
import postcssNormalizeTimingFunctions from 'postcss-normalize-timing-functions';
import cssnanoUtils from 'cssnano-utils';

const { rawCache } = cssnanoUtils;
/**
 * @template {object | void} [OptionsExtends=void]
 * @typedef {false | OptionsExtends & {exclude?: true}} SimpleOptions
 */

/**
 * @typedef {object} Options
 * @property {SimpleOptions<import('postcss-discard-comments').Options>} [discardComments]
 * @property {SimpleOptions<import('postcss-reduce-initial').Options>} [reduceInitial]
 * @property {SimpleOptions} [minifyGradients]
 * @property {SimpleOptions<import('postcss-svgo').Options>} [svgo]
 * @property {SimpleOptions} [reduceTransforms]
 * @property {SimpleOptions<import('postcss-convert-values').Options>} [convertValues]
 * @property {SimpleOptions<import('postcss-calc').PostCssCalcOptions>} [calc]
 * @property {SimpleOptions<import('postcss-colormin').Options>} [colormin]
 * @property {SimpleOptions} [orderedValues]
 * @property {SimpleOptions<import('postcss-minify-selectors').Options>} [minifySelectors]
 * @property {SimpleOptions<import('postcss-minify-params').Options>} [minifyParams]
 * @property {SimpleOptions<import('postcss-normalize-charset').Options>} [normalizeCharset]
 * @property {SimpleOptions<import('postcss-minify-font-values').Options>} [minifyFontValues]
 * @property {SimpleOptions} [normalizeUrl]
 * @property {SimpleOptions} [mergeLonghand]
 * @property {SimpleOptions} [discardDuplicates]
 * @property {SimpleOptions} [discardOverridden]
 * @property {SimpleOptions} [normalizeRepeatStyle]
 * @property {SimpleOptions<import('postcss-merge-rules').Options>} [mergeRules]
 * @property {SimpleOptions} [discardEmpty]
 * @property {SimpleOptions} [uniqueSelectors]
 * @property {SimpleOptions<import('postcss-normalize-string').Options>} [normalizeString]
 * @property {SimpleOptions} [normalizePositions]
 * @property {SimpleOptions} [normalizeWhitespace]
 * @property {SimpleOptions<import('postcss-normalize-unicode').Options>} [normalizeUnicode]
 * @property {SimpleOptions} [normalizeDisplayValues]
 * @property {SimpleOptions} [normalizeTimingFunctions]
 * @property {SimpleOptions} [rawCache]
 */

/**
 * @typedef {{ overrideBrowserslist?: string | string[] }} AutoprefixerOptions
 * @typedef {Pick<import('browserslist').Options, 'stats' | 'path' | 'env'>} BrowserslistOptions
 */

/**
 * @param {[import('postcss').PluginCreator<any>, keyof Options][]} plugins
 * @param {Parameters<typeof defaultPreset>[0]} opts
 * @returns {ReturnType<typeof defaultPreset>["plugins"]}
 */
function configurePlugins(plugins, opts = {}) {
  const { overrideBrowserslist, stats, env, path } = opts;

  // Shared Autoprefixer + Browserslist options
  const sharedProps = {
    overrideBrowserslist,
    stats,
    env,
    path,
  };

  /**
   * @type {Options}
   */
  const defaults = {
    colormin: {
      ...sharedProps,
    },
    convertValues: {
      length: false,
      ...sharedProps,
    },
    mergeRules: {
      ...sharedProps,
    },
    minifyParams: {
      ...sharedProps,
    },
    normalizeCharset: {
      add: false,
    },
    normalizeUnicode: {
      ...sharedProps,
    },
    reduceInitial: {
      ...sharedProps,
    },
    minifySelectors: {
      sort: true,
      ...sharedProps,
    },
    svgo: {
      plugins: [
        {
          name: 'preset-default',
        },
      ],
    },
  };

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
 * Safe defaults for cssnano which require minimal configuration
 *
 * @param {Options & AutoprefixerOptions & BrowserslistOptions} opts
 * @returns {{ plugins: [import('postcss').PluginCreator<any>, Options[keyof Options]][] }}
 */
function defaultPreset(opts = {}) {
  return {
    plugins: configurePlugins(
      [
        [postcssDiscardComments, 'discardComments'],
        [postcssMinifyGradients, 'minifyGradients'],
        [postcssReduceInitial, 'reduceInitial'],
        [postcssSvgo, 'svgo'],
        [postcssNormalizeDisplayValues, 'normalizeDisplayValues'],
        [postcssReduceTransforms, 'reduceTransforms'],
        [postcssColormin, 'colormin'],
        [postcssNormalizeTimingFunctions, 'normalizeTimingFunctions'],
        [postcssCalc, 'calc'],
        [postcssConvertValues, 'convertValues'],
        [postcssOrderedValues, 'orderedValues'],
        [postcssMinifySelectors, 'minifySelectors'],
        [postcssMinifyParams, 'minifyParams'],
        [postcssNormalizeCharset, 'normalizeCharset'],
        [postcssDiscardOverridden, 'discardOverridden'],
        [postcssNormalizeString, 'normalizeString'],
        [postcssNormalizeUnicode, 'normalizeUnicode'],
        [postcssMinifyFontValues, 'minifyFontValues'],
        [postcssNormalizeUrl, 'normalizeUrl'],
        [postcssNormalizeRepeatStyle, 'normalizeRepeatStyle'],
        [postcssNormalizePositions, 'normalizePositions'],
        [postcssNormalizeWhitespace, 'normalizeWhitespace'],
        [postcssMergeLonghand, 'mergeLonghand'],
        [postcssDiscardDuplicates, 'discardDuplicates'],
        [postcssMergeRules, 'mergeRules'],
        [postcssDiscardEmpty, 'discardEmpty'],
        [postcssUniqueSelectors, 'uniqueSelectors'],
        [rawCache, 'rawCache'],
      ],
      opts
    ),
  };
}
const moduleExports = defaultPreset;

export { moduleExports as default, moduleExports as 'module.exports' };
