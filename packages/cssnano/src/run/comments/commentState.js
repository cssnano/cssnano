/** @import {CanRemove} from './replaceComments.js' */
/** @import {Stage} from '../host.js' */

/**
 * The comment removal of one stylesheet: the predicate that decides which
 * comments go.
 * @typedef {{canRemove: CanRemove}} CommentState
 */

/**
 * The comment removal of a stylesheet, from the first stage that has one.
 *
 * @param {readonly Stage[]} stages
 * @returns {CommentState | null} null when no stage removes comments
 */
export function commentStateOf(stages) {
  for (const stage of stages) {
    if (stage.comments !== undefined) {
      return { canRemove: stage.comments() };
    }
  }
  return null;
}
