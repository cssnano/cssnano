import reduceInitial from '#postcss-reduce-initial';
import minifyGradients from '#postcss-minify-gradients';
import reduceTransforms from '#postcss-reduce-transforms';
import postcssConvertValues from '#postcss-convert-values';
import calc from '../plugins/postcss-calc/index.js';
import colormin from '#postcss-colormin';
import postcssOrderedValues from '#postcss-ordered-values';
import postcssMinifySelectors from '#postcss-minify-selectors';
import postcssMinifyParams from '#postcss-minify-params';
import postcssMinifyFontValues from '#postcss-minify-font-values';
import postcssNormalizeUrl from '#postcss-normalize-url';
import postcssDiscardOverridden from '#postcss-discard-overridden';
import normalizeRepeatStyle from '#postcss-normalize-repeat-style';
import postcssNormalizeString from '#postcss-normalize-string';
import postcssNormalizePositions from '#postcss-normalize-positions';
import postcssNormalizeUnicode from '#postcss-normalize-unicode';
import normalizeDisplayValues from '#postcss-normalize-display-values';
import normalizeTimingFunctions from '#postcss-normalize-timing-functions';
import { mergePass, rulesGuard } from '../passes/merge/index.js';
import {
  discardCommentsEntry,
  discardEmptyEntry,
  normalizeWhitespaceEntry,
  rawCacheEntry,
} from './sharedPluginEntries.js';

/**
 * The options of each plugin in the default preset, keyed by the preset option
 * that enables it. A plugin without options takes an empty object. The defaults
 * shown are the plugin's, except where the preset sets another value.
 *
 * @typedef {object} DefaultPluginOptions
 * @property {import('#postcss-discard-comments').Options} [discardComments] Removes comments. Comments marked as important (`/*!`) stay unless `removeAll` is set.
 * @property {Record<string, never>} [minifyGradients] Shortens gradient parameters. Takes no options.
 * @property {import('#postcss-reduce-initial').Options} [reduceInitial] Replaces the `initial` keyword with the property's actual initial value, where possible.
 * @property {Record<string, never>} [normalizeDisplayValues] Normalizes display values. Takes no options.
 * @property {Record<string, never>} [reduceTransforms] Reduces transform functions to shorter equivalent forms. Takes no options.
 * @property {import('#postcss-colormin').Options} [colormin] Shortens colors to the shortest form that the browser targets support.
 * @property {Record<string, never>} [normalizeTimingFunctions] Normalizes timing functions to shorter equivalent forms. Takes no options.
 * @property {import('postcss-calc').PostCssCalcOptions} [calc] Reduces `calc()` expressions whose result is known.
 * @property {import('#postcss-convert-values').Options} [convertValues] Converts units to shorter equivalents, such as `ms` to `s`. The preset sets `length: false`.
 * @property {Record<string, never>} [orderedValues] Orders the values of shorthand properties consistently. Takes no options.
 * @property {import('#postcss-minify-selectors').Options} [minifySelectors] Minifies selectors. The default options sort them and factor shared parts into `:is()`.
 * @property {import('#postcss-minify-params').Options} [minifyParams] Minifies at-rule parameters. Takes no options.
 * @property {import('#postcss-normalize-charset').Options} [normalizeCharset] Adds a `@charset` for files with non-ASCII characters. The preset sets `add: false`.
 * @property {Record<string, never>} [discardOverridden] Discards declarations that a later declaration overrides. Takes no options.
 * @property {import('#postcss-normalize-string').Options} [normalizeString] Normalizes string quotes to the preferred quote, double by default.
 * @property {import('#postcss-normalize-unicode').Options} [normalizeUnicode] Normalizes `unicode-range` values. Takes no options.
 * @property {import('#postcss-minify-font-values').Options} [minifyFontValues] Minifies `font` and `font-family` values.
 * @property {Record<string, never>} [normalizeUrl] Normalizes `url()` values. Takes no options.
 * @property {Record<string, never>} [normalizeRepeatStyle] Shortens `background-repeat` values, such as `repeat no-repeat` to `repeat-x`. Takes no options.
 * @property {Record<string, never>} [normalizePositions] Shortens position values. Takes no options.
 * @property {Record<string, never>} [normalizeWhitespace] Removes whitespace and line breaks that are not needed. Takes no options.
 * @property {{rules?: boolean}} [merge] Merges longhand properties into shorthands that the browser targets support, discards duplicate rules and merges rules that share a selector or declaration. Set `rules` to false to keep rules apart.
 * @property {Record<string, never>} [discardEmpty] Discards empty rules and declarations. Takes no options.
 * @property {Record<string, never>} [uniqueSelectors] Removes duplicate selectors from a selector list. Takes no options.
 * @property {Record<string, never>} [rawCache] Records the raw formatting of the output on the root, for later plugins to reuse. Takes no options.
 */

/**
 * The merge transforms run in one pass. Merging rules can bring a declaration
 * and its override into one rule, which the second longhand round then cleans up.
 * Only `rules` can be turned off, because longhand merging and duplicate removal
 * always run together.
 */
const mergeEntry = /** @type {const} */ ([
  { create: (/** @type {Record<PropertyKey, unknown>} */ options) => options },
  'merge',
  {
    targets: true,
    transform: true,
    pass: mergePass,
    optionKeys: ['rules'],
    guards: { rules: rulesGuard },
  },
]);

/**
 * The plugins of the default preset, in the order they run, each with the
 * preset option that enables it and the settings it runs with.
 */
export const defaultPluginEntries = /** @type {const} */ ([
  discardCommentsEntry,
  [minifyGradients, 'minifyGradients', { optionKeys: [] }],
  [
    reduceInitial,
    'reduceInitial',
    {
      targets: true,
      optionKeys: ['ignore'],
    },
  ],
  [normalizeDisplayValues, 'normalizeDisplayValues', { optionKeys: [] }],
  [reduceTransforms, 'reduceTransforms', { optionKeys: [] }],
  [
    colormin,
    'colormin',
    {
      targets: true,
      optionKeys: [
        'hex',
        'alphaHex',
        'rgb',
        'hsl',
        'name',
        'transparent',
        'transformCustomProperties',
      ],
    },
  ],
  [normalizeTimingFunctions, 'normalizeTimingFunctions', { optionKeys: [] }],
  [
    calc,
    'calc',
    {
      optionKeys: [
        'precision',
        'warnWhenCannotResolve',
        'mediaQueries',
        'selectors',
        'unwrapSingleValue',
        'onParseError',
      ],
    },
  ],
  [
    postcssConvertValues,
    'convertValues',
    {
      targets: true,
      defaults: { length: false },
      optionKeys: [
        'precision',
        'transformCustomProperties',
        'time',
        'length',
        'angle',
        'frequency',
      ],
    },
  ],
  [postcssOrderedValues, 'orderedValues', { optionKeys: [] }],
  [
    postcssMinifySelectors,
    'minifySelectors',
    {
      targets: true,
      defaults: { sort: true },
      optionKeys: ['sort', 'convertToIs'],
    },
  ],
  [postcssMinifyParams, 'minifyParams', { targets: true, optionKeys: [] }],
  [
    {
      create: (/** @type {Record<PropertyKey, unknown>} */ options) => options,
    },
    'normalizeCharset',
    {
      defaults: { add: false },
      optionKeys: ['add'],
      transform: true,
      after: true,
    },
  ],
  [
    postcssNormalizeString,
    'normalizeString',
    {
      optionKeys: ['preferredQuote'],
    },
  ],
  [
    postcssNormalizeUnicode,
    'normalizeUnicode',
    {
      targets: true,
      optionKeys: [],
    },
  ],
  [
    postcssMinifyFontValues,
    'minifyFontValues',
    {
      optionKeys: ['removeAfterKeyword', 'removeDuplicates', 'removeQuotes'],
    },
  ],
  [postcssNormalizeUrl, 'normalizeUrl', { optionKeys: [] }],
  [normalizeRepeatStyle, 'normalizeRepeatStyle', { optionKeys: [] }],
  [postcssNormalizePositions, 'normalizePositions', { optionKeys: [] }],
  [
    postcssDiscardOverridden,
    'discardOverridden',
    {
      optionKeys: [],
      transform: true,
    },
  ],
  normalizeWhitespaceEntry,
  mergeEntry,
  discardEmptyEntry,
  [
    {
      create: (/** @type {Record<PropertyKey, unknown>} */ options) => options,
    },
    'uniqueSelectors',
    {
      optionKeys: [],
      transform: true,
      after: true,
    },
  ],
  rawCacheEntry,
]);
