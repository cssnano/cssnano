import { discardAndReport } from '#postcss-discard-empty';
import { uniqueRuleSelector } from '#postcss-unique-selectors';
import rawCache from '../utils/rawCache.js';

/** @import {Result, Root} from 'postcss' */

/**
 * The walk after merge runs the whole-stylesheet transforms that need the tree
 * as merge left it. It records the raw cache last, so no later transform
 * changes what the cache describes.
 *
 * @param {Root} root
 * @param {Result} result
 * @param {ReadonlyMap<string, Record<PropertyKey, unknown>>} transforms the options of each transform on, by entry name
 * @returns {void}
 */
export function walkAfterMerge(root, result, transforms) {
  const unique = transforms.has('uniqueSelectors');
  if (transforms.has('discardEmpty')) {
    discardAndReport(root, result, unique);
  } else if (unique) {
    root.walkRules(uniqueRuleSelector);
  }
  if (transforms.has('rawCache')) rawCache(result);
}
