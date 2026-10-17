import postcssDiscardComments from '#postcss-discard-comments';
import postcssReduceInitial from '#postcss-reduce-initial';
import postcssMinifyGradients from '#postcss-minify-gradients';
import postcssReduceTransforms from '#postcss-reduce-transforms';
import postcssConvertValues from '#postcss-convert-values';
import postcssCalc from 'postcss-calc';
import postcssColormin from '#postcss-colormin';
import postcssOrderedValues from '#postcss-ordered-values';
import postcssMinifySelectors from '#postcss-minify-selectors';
import postcssMinifyParams from '#postcss-minify-params';
import postcssNormalizeCharset from '#postcss-normalize-charset';
import postcssMinifyFontValues from '#postcss-minify-font-values';
import postcssNormalizeUrl from '#postcss-normalize-url';
import postcssMergeLonghand from '#postcss-merge-longhand';
import postcssDiscardDuplicates from '#postcss-discard-duplicates';
import postcssDiscardOverridden from '#postcss-discard-overridden';
import postcssNormalizeRepeatStyle from '#postcss-normalize-repeat-style';
import postcssMergeRules from '#postcss-merge-rules';
import postcssDiscardEmpty from '#postcss-discard-empty';
import postcssUniqueSelectors from '#postcss-unique-selectors';
import postcssNormalizeString from '#postcss-normalize-string';
import postcssNormalizePositions from '#postcss-normalize-positions';
import postcssNormalizeWhitespace from '#postcss-normalize-whitespace';
import postcssNormalizeUnicode from '#postcss-normalize-unicode';
import postcssNormalizeDisplayValues from '#postcss-normalize-display-values';
import postcssNormalizeTimingFunctions from '#postcss-normalize-timing-functions';
import cssnanoUtils from '#utils';
import { ignoredTargetOptionsPlugin } from '#utils/ignored-target-options';

const { rawCache, presetTargets, targetOptionKeys } = cssnanoUtils;
/**
 * @template {object | void} [OptionsExtends=void]
 * @typedef {false | OptionsExtends & {exclude?: true}} SimpleOptions
 */

/**
 * Browser targets are preset options, shared by every plugin, so a plugin's
 * own options leave them out.
 * @template {object} PluginOptions
 * @typedef {SimpleOptions<Omit<PluginOptions, keyof import('#utils').TargetOptions>>} TargetDependentOptions
 */

/**
 * @typedef {object} Options
 * @property {SimpleOptions<import('#postcss-discard-comments').Options>} [discardComments]
 * @property {TargetDependentOptions<import('#postcss-reduce-initial').Options>} [reduceInitial]
 * @property {SimpleOptions} [minifyGradients]
 * @property {false | Record<string, unknown>} [svgo] Ignored; run postcss-svgo before cssnano.
 * @property {SimpleOptions} [reduceTransforms]
 * @property {TargetDependentOptions<import('#postcss-convert-values').Options>} [convertValues]
 * @property {SimpleOptions<import('postcss-calc').PostCssCalcOptions>} [calc]
 * @property {TargetDependentOptions<import('#postcss-colormin').Options>} [colormin]
 * @property {SimpleOptions} [orderedValues]
 * @property {TargetDependentOptions<import('#postcss-minify-selectors').Options>} [minifySelectors]
 * @property {TargetDependentOptions<import('#postcss-minify-params').Options>} [minifyParams]
 * @property {SimpleOptions<import('#postcss-normalize-charset').Options>} [normalizeCharset]
 * @property {SimpleOptions<import('#postcss-minify-font-values').Options>} [minifyFontValues]
 * @property {SimpleOptions} [normalizeUrl]
 * @property {TargetDependentOptions<import('#postcss-merge-longhand').Options>} [mergeLonghand]
 * @property {SimpleOptions} [discardDuplicates]
 * @property {SimpleOptions} [discardOverridden]
 * @property {SimpleOptions} [normalizeRepeatStyle]
 * @property {TargetDependentOptions<import('#postcss-merge-rules').Options>} [mergeRules]
 * @property {SimpleOptions} [discardEmpty]
 * @property {SimpleOptions} [uniqueSelectors]
 * @property {SimpleOptions<import('#postcss-normalize-string').Options>} [normalizeString]
 * @property {SimpleOptions} [normalizePositions]
 * @property {SimpleOptions} [normalizeWhitespace]
 * @property {TargetDependentOptions<import('#postcss-normalize-unicode').Options>} [normalizeUnicode]
 * @property {SimpleOptions} [normalizeDisplayValues]
 * @property {SimpleOptions} [normalizeTimingFunctions]
 * @property {SimpleOptions} [rawCache]
 */

/**
 * @typedef {{ overrideBrowserslist?: string | string[] }} AutoprefixerOptions
 * @typedef {Pick<import('#utils').TargetOptions, 'stats' | 'path' | 'env'>} BrowserslistOptions
 */

/**
 * Plugins that judge a file against the preset's browser targets.
 * @type {ReadonlySet<keyof Options>}
 */
const targetDependent = new Set([
  'colormin',
  'convertValues',
  'mergeLonghand',
  'mergeRules',
  'minifyParams',
  'normalizeUnicode',
  'reduceInitial',
  'minifySelectors',
]);

/**
 * @param {[import('postcss').PluginCreator<any>, keyof Options][]} plugins
 * @param {Parameters<typeof defaultPreset>[0]} opts
 * @returns {ReturnType<typeof defaultPreset>["plugins"]}
 */
function configurePlugins(plugins, opts = {}) {
  const { overrideBrowserslist, stats, env, path } = opts;

  // One set of browser targets for the whole preset, so every plugin judges
  // a file against the same browsers
  const targets = {
    overrideBrowserslist,
    stats,
    env,
    path,
  };

  /**
   * @type {Options}
   */
  const defaults = {
    convertValues: {
      length: false,
    },
    normalizeCharset: {
      add: false,
    },
    minifySelectors: {
      sort: true,
    },
  };

  // Merge option properties for each plugin. The preset targets replace the
  // target options the user set on a plugin, which move into a list of
  // ignored ones under a symbol, so the plugin can warn about them once.
  // Plain options survive a wrapper preset that copies or edits them.
  /** @type {{plugin: string, ignored: readonly string[]}[]} */
  const unreported = [];
  /** @type {ReturnType<typeof defaultPreset>['plugins']} */
  const configured = plugins.map(([plugin, opt]) => {
    const defaultProps = defaults[opt] ?? {};
    const presetProps = /** @type {Record<string, unknown> | false} */ (
      opts[opt] ?? {}
    );
    if (presetProps === false) return [plugin, { exclude: true }];

    const ignored = targetOptionKeys.filter(
      (key) => presetProps[key] !== undefined
    );
    const pluginProps = /** @type {Record<string, unknown>} */ ({
      ...defaultProps,
      ...presetProps,
    });
    for (const key of ignored) delete pluginProps[key];
    // Only a target-dependent plugin can report its own ignored options.
    if (ignored.length > 0 && !targetDependent.has(opt)) {
      unreported.push({ plugin: opt, ignored });
    }

    return [
      plugin,
      targetDependent.has(opt)
        ? {
            ...pluginProps,
            ...targets,
            [presetTargets]: { plugin: opt, ignored },
          }
        : pluginProps,
    ];
  });
  if (unreported.length > 0) {
    configured.push([
      /** @type {import('postcss').PluginCreator<any>} */ (
        /** @type {unknown} */ (ignoredTargetOptionsPlugin)
      ),
      { reports: unreported },
    ]);
  }
  return configured;
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
        [postcssNormalizeDisplayValues, 'normalizeDisplayValues'],
        [postcssReduceTransforms, 'reduceTransforms'],
        [postcssColormin, 'colormin'],
        [postcssNormalizeTimingFunctions, 'normalizeTimingFunctions'],
        [
          /** @type {import('postcss').PluginCreator<any>} */ (postcssCalc),
          'calc',
        ],
        [postcssConvertValues, 'convertValues'],
        [postcssOrderedValues, 'orderedValues'],
        [postcssMinifySelectors, 'minifySelectors'],
        [
          /** @type {import('postcss').PluginCreator<any>} */ (
            /** @type {unknown} */ (postcssMinifyParams)
          ),
          'minifyParams',
        ],
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
        // Merging rules can bring a declaration and its override into one rule
        [postcssMergeLonghand, 'mergeLonghand'],
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
