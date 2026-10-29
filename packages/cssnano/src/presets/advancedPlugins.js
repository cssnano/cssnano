import { discardUnusedSymbols } from '#postcss-discard-unused';
import { mergeIdentsSymbols } from '#postcss-merge-idents';
import { createReducers, reduceIdentsSymbols } from '#postcss-reduce-idents';
import { zindexSymbols } from '#postcss-zindex';
import { defaultPluginEntries } from './defaultPlugins.js';

/** @import {EntryFor} from './configurePlugins.js' */
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
  /** @satisfies {EntryFor<AdvancedPluginOptions, 'discardUnused'>} */ ([
    {
      create: (
        /** @type {import('#postcss-discard-unused').Options} */ options
      ) => options,
    },
    'discardUnused',
    {
      optionKeys: ['fontFace', 'counterStyle', 'keyframes', 'namespace'],
      transform: true,
      symbols: /** @type {SymbolTransform} */ (discardUnusedSymbols),
    },
  ]),
  /** @satisfies {EntryFor<AdvancedPluginOptions, 'mergeIdents'>} */ ([
    {
      create: (/** @type {Record<string, never>} */ options) => options,
    },
    'mergeIdents',
    {
      optionKeys: [],
      transform: true,
      symbols: /** @type {SymbolTransform} */ (mergeIdentsSymbols),
    },
  ]),
  /** @satisfies {EntryFor<AdvancedPluginOptions, 'reduceIdents'>} */ ([
    {
      create: (
        /** @type {import('#postcss-reduce-idents').Options} */ options
      ) => createReducers(options),
    },
    'reduceIdents',
    {
      optionKeys: [
        'counter',
        'counterStyle',
        'keyframes',
        'gridTemplate',
        'encoder',
      ],
      transform: true,
      // Its options are the reducers that create built.
      symbols: /** @type {SymbolTransform} */ (
        /** @type {unknown} */ (reduceIdentsSymbols)
      ),
    },
  ]),
  /** @satisfies {EntryFor<AdvancedPluginOptions, 'zindex'>} */ ([
    {
      create: (/** @type {import('#postcss-zindex').Options} */ options) =>
        options,
    },
    'zindex',
    {
      optionKeys: ['startIndex'],
      transform: true,
      symbols: /** @type {SymbolTransform} */ (zindexSymbols),
    },
  ]),
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
