import type { ArenaIndex } from '../../passes/ir/blockRecord.js';
import type { BlockRecords } from '../../passes/ir/blockRecords.js';
import type { CommentState } from './commentState.js';
/** @import {ArenaIndex, BlockRecord, NodeEntry} from '../../passes/ir/blockRecord.js' */
/** @import {BlockRecords} from '../../passes/ir/blockRecords.js' */
/** @import {RuleRecord} from '../../passes/ir/ruleRecord.js' */
/** @import {CommentState} from './commentState.js' */
/**
 * Removes the comments in the gap between a rule's or at-rule's prelude and
 * its block.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} index
 * @param {CommentState} comments
 */
export declare function removeBetween(records: BlockRecords, index: ArenaIndex, comments: CommentState): void;
//# sourceMappingURL=removeBetween.d.ts.map