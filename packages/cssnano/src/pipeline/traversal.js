import { reattachBlockEscape } from './whitespaceRaws.js';

/** @import {Root} from 'postcss' */
/** @import {CommentState} from './comments/nodeComments.js' */

/**
 * Removes the comments that the comment removal accepts, and reattaches the
 * escaped character of each block when normalizeWhitespace is on, in a single
 * walk, in document order. Everything else is left to the record walk.
 *
 * @param {Root} root
 * @param {ReadonlyMap<string, unknown>} transforms the whole-stylesheet transforms of the run, by entry name
 * @param {CommentState | null} comments the comment removal of the stylesheet, or null when no stage removes comments
 */
export function walkStylesheet(root, transforms, comments) {
  const normalizeWhitespace = transforms.has('normalizeWhitespace');
  root.walk((node) => {
    if (node.type === 'comment') {
      if (comments?.canRemove(node.text)) node.remove();
    } else if (
      (node.type === 'atrule' || node.type === 'rule') &&
      normalizeWhitespace
    ) {
      reattachBlockEscape(node);
    }
  });
}
