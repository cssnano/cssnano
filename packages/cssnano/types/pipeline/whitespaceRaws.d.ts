import type { ArenaIndex } from '../passes/ir/blockRecord.js';
import type { TokenListId } from '../passes/ir/tokenLists.js';
import type { BlockRecords } from '../passes/ir/blockRecords.js';
import type { RunContext } from '../passes/ir/runContext.js';
/** @import {ArenaIndex, BlockRecord} from '../passes/ir/blockRecord.js' */
/** @import {DeclarationRecord} from '../passes/ir/declarationRecord.js' */
/** @import {RuleRecord} from '../passes/ir/ruleRecord.js' */
/** @import {TokenListId} from '../passes/ir/tokenLists.js' */
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
 * The value of a declaration with the character its last backslash escapes.
 * The parser puts that character in the raw after the block when the value
 * ends the block's text, so the escape would otherwise take the closing brace.
 * An important flag follows its value, so the escape there takes the flag's
 * own whitespace. The value is the one the comment removal left, so the
 * character joins what the declaration keeps.
 *
 * @param {BlockRecords} records
 * @param {RunContext} run
 * @param {ArenaIndex} index a declaration
 * @param {TokenListId} value the id of the declaration's value, without the comments that go
 * @returns {TokenListId} the id of the value with the character, or `value` when no escape is open
 */
export declare function withBlockEscape(records: BlockRecords, run: RunContext, index: ArenaIndex, value: TokenListId): TokenListId;
//# sourceMappingURL=whitespaceRaws.d.ts.map