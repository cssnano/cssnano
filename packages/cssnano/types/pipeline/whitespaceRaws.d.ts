import type { ArenaIndex } from '../passes/ir/blockRecord.js';
import type { BlockRecords } from '../passes/ir/blockRecords.js';
import type { RunContext } from '../passes/ir/runContext.js';
/** @import {ArenaIndex} from '../passes/ir/blockRecord.js' */
/** @import {BlockRecords} from '../passes/ir/blockRecords.js' */
/** @import {RunContext} from '../passes/ir/runContext.js' */
/**
 * Removes the stray semicolons that the raw whitespace before a declaration
 * keeps, as `a{color:red;;_color:blue}` does. A declaration that opens its
 * container, or follows a rule, keeps its raw, since the parser gives no
 * semicolon there that the output needs to drop.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} index a declaration
 */
export declare function stripStrayRawSemicolon(records: BlockRecords, index: ArenaIndex): void;
/**
 * Gives the escaped character of a block back to its last declaration. The
 * parser puts that character in the raw after the block when the last
 * declaration has no semicolon, so the escape would otherwise be left dangling.
 * The declaration's value becomes its cleaned value with the character, which
 * is what the node form did, so the comments the value held are dropped too.
 *
 * @param {BlockRecords} records
 * @param {RunContext} run
 * @param {ArenaIndex} index a rule or an at-rule with a block, before its children are visited
 */
export declare function reattachBlockEscape(records: BlockRecords, run: RunContext, index: ArenaIndex): void;
//# sourceMappingURL=whitespaceRaws.d.ts.map