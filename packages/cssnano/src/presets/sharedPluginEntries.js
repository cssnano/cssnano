import postcssDiscardComments from '#postcss-discard-comments';
import postcssNormalizeWhitespace from '#postcss-normalize-whitespace';
import postcssDiscardEmpty from '#postcss-discard-empty';
import cssnanoUtils from '#utils';

const { rawCache } = cssnanoUtils;

/**
 * The plugin entries that more than one built-in preset runs. Each is defined
 * once, so the settings of an option cannot differ between presets.
 */

export const discardCommentsEntry = /** @type {const} */ ([
  postcssDiscardComments,
  'discardComments',
  {
    postcssPlugin: 'postcss-discard-comments',
    optionKeys: ['removeAll', 'removeAllButFirst', 'remove'],
  },
]);

export const normalizeWhitespaceEntry = /** @type {const} */ ([
  postcssNormalizeWhitespace,
  'normalizeWhitespace',
  { postcssPlugin: 'postcss-normalize-whitespace', optionKeys: [] },
]);

export const discardEmptyEntry = /** @type {const} */ ([
  postcssDiscardEmpty,
  'discardEmpty',
  { postcssPlugin: 'postcss-discard-empty', optionKeys: [] },
]);

export const rawCacheEntry = /** @type {const} */ ([
  rawCache,
  'rawCache',
  { postcssPlugin: 'cssnano-util-raw-cache', optionKeys: [] },
]);
