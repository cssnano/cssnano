import discardComments from '#postcss-discard-comments';
import { valueEntry as normalizeWhitespaceValues } from '#postcss-normalize-whitespace';
/** @import {EntryFor} from './configurePlugins.js' */
/** @import {DefaultPluginOptions} from './defaultPlugins.js' */

/**
 * The plugin entries that more than one built-in preset runs. Each is defined
 * once, so the settings of an option cannot differ between presets.
 */

export const discardCommentsEntry =
  /** @satisfies {EntryFor<DefaultPluginOptions, 'discardComments'>} */ (
    /** @type {const} */ ([
      discardComments,
      'discardComments',
      {
        optionKeys: ['removeAll', 'removeAllButFirst', 'remove'],
      },
    ])
  );

export const normalizeWhitespaceEntry =
  /** @satisfies {EntryFor<DefaultPluginOptions, 'normalizeWhitespace'>} */ (
    /** @type {const} */ ([
      normalizeWhitespaceValues,
      'normalizeWhitespace',
      {
        optionKeys: [],
        walk: true,
        after: true,
      },
    ])
  );

/**
 * discardEmpty runs in the walk after merge of its host, so the host walks the
 * stylesheet without a plugin of its own.
 */
export const discardEmptyEntry =
  /** @satisfies {EntryFor<DefaultPluginOptions, 'discardEmpty'>} */ (
    /** @type {const} */ ([
      { create: (/** @type {Record<string, never>} */ options) => options },
      'discardEmpty',
      {
        optionKeys: [],
        transform: true,
        after: true,
      },
    ])
  );

/**
 * rawCache runs last in the walk after merge of its host.
 */
export const rawCacheEntry =
  /** @satisfies {EntryFor<DefaultPluginOptions, 'rawCache'>} */ (
    /** @type {const} */ ([
      { create: (/** @type {Record<string, never>} */ options) => options },
      'rawCache',
      {
        optionKeys: [],
        transform: true,
        after: true,
      },
    ])
  );
