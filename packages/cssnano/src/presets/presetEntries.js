/**
 * The key that a built-in preset function carries, holding the plugins that it
 * runs. cssnano reads it from the function the user imported, so no table of
 * presets is needed. The symbol is registered globally, so every copy of cssnano
 * reads it the same way.
 */
export const presetEntriesKey = Symbol.for('cssnano.presetEntries');

/**
 * The key that a built-in preset function carries, holding its name, such as
 * 'lite'. The name lets the types tell the presets apart, so each preset accepts
 * only the plugin names and options that it runs.
 */
export const presetNameKey = Symbol.for('cssnano.presetName');

/**
 * The key that a built-in preset function carries, holding a function that builds
 * its plugins from options that cssnano has already validated against the preset.
 * Calling the preset itself would validate them a second time.
 */
export const presetConfigureKey = Symbol.for('cssnano.presetConfigure');

/**
 * A built-in preset function, tagged with the name that identifies it, the
 * plugins it runs and the function that builds them from validated options.
 * @template {string} Name
 * @template {object} Plugins the options of each plugin the preset runs, keyed by its preset option
 * @typedef {((options?: import('./configurePlugins.js').PresetOptions<Plugins>) => import('postcss').AcceptedPlugin[]) & {readonly [presetNameKey]: Name, readonly [presetEntriesKey]: readonly import('./configurePlugins.js').PluginEntry[], readonly [presetConfigureKey]: (known: Record<string, unknown>) => import('postcss').AcceptedPlugin[]}} NamedPreset
 */

/**
 * A preset function that cssnano exports, such as the one from
 * cssnano/presets/lite. Only these can be given as the preset option.
 * @typedef {NamedPreset<'default', import('./defaultPlugins.js').DefaultPluginOptions> | NamedPreset<'lite', import('./litePlugins.js').LitePluginOptions> | NamedPreset<'advanced', import('./advancedPlugins.js').AdvancedPluginOptions>} BuiltInPreset
 */

/**
 * The plugins of the default preset, named here so options.js can report a
 * plugin name at the top level without loading the plugin modules. A test keeps
 * the list equal to the default preset's own.
 */
export const defaultPluginNames = /** @type {const} */ ([
  'discardComments',
  'minifyGradients',
  'reduceInitial',
  'normalizeDisplayValues',
  'reduceTransforms',
  'colormin',
  'normalizeTimingFunctions',
  'calc',
  'convertValues',
  'orderedValues',
  'minifySelectors',
  'minifyParams',
  'normalizeCharset',
  'discardOverridden',
  'normalizeString',
  'normalizeUnicode',
  'minifyFontValues',
  'normalizeUrl',
  'normalizeRepeatStyle',
  'normalizePositions',
  'normalizeWhitespace',
  'merge',
  'discardEmpty',
  'uniqueSelectors',
  'rawCache',
]);

/**
 * The advanced-only plugins, named here so a configuration without the advanced
 * preset can report them without loading their modules. A type test keeps the
 * list equal to the advanced preset's own.
 */
export const advancedOnlyPluginNames = /** @type {const} */ ([
  'discardUnused',
  'mergeIdents',
  'reduceIdents',
  'zindex',
]);

/**
 * The PostCSS plugin behind each preset option, by option name. The site and the
 * tests read it, since a preset entry names its option, not its plugin. A test
 * keeps the keys equal to the options of the built-in presets.
 * @type {Readonly<Record<string, string>>}
 */
export const pluginNameByOption = Object.freeze({
  discardComments: 'postcss-discard-comments',
  minifyGradients: 'postcss-minify-gradients',
  reduceInitial: 'postcss-reduce-initial',
  normalizeDisplayValues: 'postcss-normalize-display-values',
  reduceTransforms: 'postcss-reduce-transforms',
  colormin: 'postcss-colormin',
  normalizeTimingFunctions: 'postcss-normalize-timing-functions',
  calc: 'postcss-calc',
  convertValues: 'postcss-convert-values',
  orderedValues: 'postcss-ordered-values',
  minifySelectors: 'postcss-minify-selectors',
  minifyParams: 'postcss-minify-params',
  normalizeCharset: 'postcss-normalize-charset',
  discardOverridden: 'postcss-discard-overridden',
  normalizeString: 'postcss-normalize-string',
  normalizeUnicode: 'postcss-normalize-unicode',
  minifyFontValues: 'postcss-minify-font-values',
  normalizeUrl: 'postcss-normalize-url',
  normalizeRepeatStyle: 'postcss-normalize-repeat-style',
  normalizePositions: 'postcss-normalize-positions',
  normalizeWhitespace: 'postcss-normalize-whitespace',
  merge: 'cssnano-merge',
  discardEmpty: 'postcss-discard-empty',
  uniqueSelectors: 'postcss-unique-selectors',
  rawCache: 'cssnano-util-raw-cache',
  discardUnused: 'postcss-discard-unused',
  mergeIdents: 'postcss-merge-idents',
  reduceIdents: 'postcss-reduce-idents',
  zindex: 'postcss-zindex',
});
