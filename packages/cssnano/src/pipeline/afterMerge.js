import {
  discardAndReport,
  removeAndDiscardEmptied,
} from '#postcss-discard-empty';
import { normalizeNodeRaws } from '#postcss-normalize-whitespace';
import { uniqueSelectorsVisit } from '#postcss-unique-selectors';
import {
  charsetVisit,
  decideCharset,
  rescanNonAscii,
} from '#postcss-normalize-charset';
import rawCache from '../utils/rawCache.js';
import { createSymbolLists, symbolVisit } from './symbolLists.js';

/** @import {AnyNode, ChildNode, Result, Root} from 'postcss' */
/** @import {CharsetScan} from '#postcss-normalize-charset' */
/** @import {SymbolTransform} from './host.js' */
/** @import {SymbolLists} from './symbolLists.js' */

/**
 * The walk after merge runs the whole-stylesheet transforms that need the tree
 * as merge left it. Per-node transforms share one walk, so no transform needs
 * its own. The advanced transforms then edit the lists the walk collected. The
 * charset decision follows them, and the raw cache records last, so no later
 * transform changes what the cache describes.
 *
 * @param {Root} root
 * @param {Result} result
 * @param {ReadonlyMap<string, Record<PropertyKey, unknown>>} transforms the options of each transform on, by entry name
 * @param {ReadonlyMap<string, {transform: SymbolTransform, options: Record<PropertyKey, unknown>}>} symbols
 *   the advanced transforms on, in order
 * @returns {void}
 */
export function walkAfterMerge(root, result, transforms, symbols) {
  /** @type {((node: AnyNode) => void)[]} */
  const visits = [];
  if (transforms.has('normalizeWhitespace')) {
    visits.push(normalizeNodeRaws);
    // Remove the final newline, which the raws of the root hold.
    root.raws.after = '';
  }
  if (transforms.has('uniqueSelectors')) visits.push(uniqueSelectorsVisit);
  const charsetOptions = transforms.get('normalizeCharset');
  /** @type {CharsetScan} */
  const charset = { first: undefined, charsets: [], nonAscii: undefined };
  const lists = symbols.size > 0 ? createSymbolLists() : undefined;
  if (lists) {
    visits.push(symbolVisit(lists));
    // A transform over the lists may remove the first non-ASCII text.
    charset.candidates = [];
  }
  if (charsetOptions) visits.push((node) => charsetVisit(node, charset));
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
  if (lists) runSymbolTransforms(lists, symbols, result, transforms);
  if (charsetOptions) {
    if (lists) rescanNonAscii(charset);
    decideCharset(
      root,
      charset,
      /** @type {import('#postcss-normalize-charset').Options} */ (
        charsetOptions
      )
    );
  }
  if (transforms.has('rawCache')) rawCache(result);
}

/**
 * Runs the advanced transforms in preset order over the lists of the walk.
 * With discardEmpty on, a removal also removes the ancestors it empties.
 *
 * @param {SymbolLists} lists
 * @param {ReadonlyMap<string, {transform: SymbolTransform, options: Record<PropertyKey, unknown>}>} symbols
 * @param {Result} result
 * @param {ReadonlyMap<string, Record<PropertyKey, unknown>>} transforms
 * @returns {void}
 */
function runSymbolTransforms(lists, symbols, result, transforms) {
  /** @type {(node: ChildNode) => void} */
  const remove = transforms.has('discardEmpty')
    ? (node) => removeAndDiscardEmptied(node, result)
    : (node) => node.remove();
  for (const { transform, options } of symbols.values()) {
    transform(lists, options, remove);
  }
}
