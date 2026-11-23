import type { ArenaIndex } from '../../ir/blockRecord.js';
import type { BlockRecords } from '../../ir/blockRecords.js';
import type { CommentState } from './commentState.js';
/** @import {ArenaIndex, BlockRecord, NodeEntry} from '../../ir/blockRecord.js' */
/** @import {BlockRecords} from '../../ir/blockRecords.js' */
/** @import {RuleRecord} from '../../ir/ruleRecord.js' */
/** @import {CommentState} from './commentState.js' */
/**
 * Removes the comments in the gap between a rule's or at-rule's prelude and
 * its block. A newline after a final backslash stays: it makes the backslash an
 * invalid escape, where the next character would otherwise be escaped.
 *
 * @param {BlockRecords} records
 * @param {import('../../ir/tokenLists.js').TokenLists} tokenLists
 * @param {ArenaIndex} index
 * @param {CommentState} comments
 */
export declare function removeBetween(records: BlockRecords, tokenLists: import('../../ir/tokenLists.js').TokenLists, index: ArenaIndex, comments: CommentState): void;
//# sourceMappingURL=removeBetween.d.ts.map