/** @import {CanRemove} from './replaceComments.js' */
/** @import {Stage} from '../host.js' */
import type { CanRemove } from './replaceComments.js';
import type { Stage } from '../host.js';
export type CommentState = {
    canRemove: CanRemove;
};
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
export declare function commentStateOf(stages: readonly Stage[]): CommentState | null;
//# sourceMappingURL=commentState.d.ts.map