import { discardAndReport } from '#postcss-discard-empty';
import { normalizeNodeRaws } from '#postcss-normalize-whitespace';
import { uniqueSelectorsVisit } from '#postcss-unique-selectors';
import rawCache from '../utils/rawCache.js';

/** @import {AnyNode, Result, Root} from 'postcss' */

/**
 * The walk after merge runs the whole-stylesheet transforms that need the tree
 * as merge left it. Per-node transforms share one walk, so no transform needs
 * its own. It records the raw cache last, so no later transform
 * changes what the cache describes.
 *
 * @param {Root} root
 * @param {Result} result
 * @param {ReadonlyMap<string, Record<PropertyKey, unknown>>} transforms the options of each transform on, by entry name
 * @returns {void}
 */
export function walkAfterMerge(root, result, transforms) {
  /** @type {((node: AnyNode) => void)[]} */
  const visits = [];
  if (transforms.has('normalizeWhitespace')) {
    visits.push(normalizeNodeRaws);
    // Remove the final newline, which the raws of the root hold.
    root.raws.after = '';
  }
  if (transforms.has('uniqueSelectors')) visits.push(uniqueSelectorsVisit);
  /** @type {((node: AnyNode) => void) | undefined} */
  const visit =
    visits.length > 1
      ? (node) => {
          for (const each of visits) each(node);
        }
      : visits[0];
  if (transforms.has('discardEmpty')) {
    discardAndReport(root, result, visit);
  } else if (visit) {
    root.walk(visit);
  }
  if (transforms.has('rawCache')) rawCache(result);
}
