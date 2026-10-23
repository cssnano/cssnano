import { discardUnusedSymbols } from '#postcss-discard-unused';
import { mergeIdentsSymbols } from '#postcss-merge-idents';
import postcssReduceIdents from '#postcss-reduce-idents';
import postcssZindex from '#postcss-zindex';
import { defaultPluginEntries } from './defaultPlugins.js';

/** @import {SymbolTransform} from '../pipeline/host.js' */

/**
 * The options of the plugins that only the advanced preset adds.
 * @typedef {object} AdvancedOnlyPluginOptions
 * @property {import('#postcss-discard-unused').Options} [discardUnused] Discards unused font faces, counter styles, keyframes and namespaces.
 * @property {Record<string, never>} [mergeIdents] Merges keyframe and counter style names that define the same rules. Takes no options.
 * @property {import('#postcss-reduce-idents').Options} [reduceIdents] Shortens custom identifiers, such as keyframe and counter style names.
 * @property {import('#postcss-zindex').Options} [zindex] Reduces z-index values to small integers that keep their order.
 */

/**
 * The options of each plugin in the advanced preset: the default preset's, then
 * the advanced plugins'.
 * @typedef {import('./defaultPlugins.js').DefaultPluginOptions & AdvancedOnlyPluginOptions} AdvancedPluginOptions
 */

/**
 * The plugins the advanced preset adds to the default ones, each with the
 * preset option that enables it. Referenced only by the type tests.
 *
 * @lintignore
 */
export const advancedPluginEntries = /** @type {const} */ ([
  [
    {
      create: (/** @type {Record<PropertyKey, unknown>} */ options) => options,
    },
    'discardUnused',
    {
      postcssPlugin: 'postcss-discard-unused',
      optionKeys: ['fontFace', 'counterStyle', 'keyframes', 'namespace'],
      transform: true,
      symbols: /** @type {SymbolTransform} */ (discardUnusedSymbols),
    },
  ],
  [
    {
      create: (/** @type {Record<PropertyKey, unknown>} */ options) => options,
    },
    'mergeIdents',
    {
      postcssPlugin: 'postcss-merge-idents',
      optionKeys: [],
      transform: true,
      symbols: /** @type {SymbolTransform} */ (mergeIdentsSymbols),
    },
  ],
  [
    postcssReduceIdents,
    'reduceIdents',
    {
      postcssPlugin: 'postcss-reduce-idents',
      optionKeys: [
        'counter',
        'counterStyle',
        'keyframes',
        'gridTemplate',
        'encoder',
      ],
    },
  ],
  [
    postcssZindex,
    'zindex',
    { postcssPlugin: 'postcss-zindex', optionKeys: ['startIndex'] },
  ],
]);

/**
 * Every plugin the advanced preset runs: the default ones, then the advanced ones.
 * It is built once, so the preset and the option validation share the list.
 * @type {readonly import('./configurePlugins.js').PluginEntry[]}
 */
export const advancedPresetEntries = Object.freeze([
  ...defaultPluginEntries,
  ...advancedPluginEntries,
]);
