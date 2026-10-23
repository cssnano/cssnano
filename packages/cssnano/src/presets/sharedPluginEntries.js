import discardComments from '#postcss-discard-comments';
import postcssNormalizeWhitespace, {
  valueEntry as normalizeWhitespaceValues,
} from '#postcss-normalize-whitespace';
import postcssDiscardEmpty from '#postcss-discard-empty';
import cssnanoUtils from '#utils';

const { rawCache } = cssnanoUtils;

/**
 * The plugin entries that more than one built-in preset runs. Each is defined
 * once, so the settings of an option cannot differ between presets.
 */

export const discardCommentsEntry = /** @type {const} */ ([
  discardComments,
  'discardComments',
  {
    postcssPlugin: 'postcss-discard-comments',
    optionKeys: ['removeAll', 'removeAllButFirst', 'remove'],
  },
]);

export const normalizeWhitespaceEntry = /** @type {const} */ ([
  postcssNormalizeWhitespace,
  'normalizeWhitespace',
  {
    postcssPlugin: 'postcss-normalize-whitespace',
    optionKeys: [],
    // Until the raws move into the walk, the plugin runs after its value stage,
    // which joins the run that the plugin ends.
    stage: normalizeWhitespaceValues,
    walk: true,
  },
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
