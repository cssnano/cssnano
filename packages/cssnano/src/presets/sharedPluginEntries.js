import discardComments from '#postcss-discard-comments';
import postcssNormalizeWhitespace, {
  valueEntry as normalizeWhitespaceValues,
} from '#postcss-normalize-whitespace';

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

/**
 * discardEmpty runs in the walk after merge of its host, so the host walks the
 * stylesheet without a plugin of its own.
 */
export const discardEmptyEntry = /** @type {const} */ ([
  { create: (/** @type {Record<PropertyKey, unknown>} */ options) => options },
  'discardEmpty',
  {
    postcssPlugin: 'postcss-discard-empty',
    optionKeys: [],
    transform: true,
    after: true,
  },
]);

/**
 * rawCache runs last in the walk after merge of its host.
 */
export const rawCacheEntry = /** @type {const} */ ([
  { create: (/** @type {Record<PropertyKey, unknown>} */ options) => options },
  'rawCache',
  {
    postcssPlugin: 'cssnano-util-raw-cache',
    optionKeys: [],
    transform: true,
    after: true,
  },
]);
