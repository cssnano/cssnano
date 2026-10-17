import {
  discardCommentsEntry,
  discardEmptyEntry,
  normalizeWhitespaceEntry,
  rawCacheEntry,
} from './sharedPluginEntries.js';

/**
 * The options of each plugin in the lite preset. They are the default preset's
 * options for the plugins they share, so the settings of a plugin cannot differ.
 * @typedef {Pick<import('./defaultPlugins.js').DefaultPluginOptions, 'discardComments' | 'normalizeWhitespace' | 'discardEmpty' | 'rawCache'>} LitePluginOptions
 */

/**
 * The plugins of the lite preset, in the order they run, each with the
 * preset option that enables it.
 */
export const litePluginEntries = /** @type {const} */ ([
  discardCommentsEntry,
  normalizeWhitespaceEntry,
  discardEmptyEntry,
  rawCacheEntry,
]);
