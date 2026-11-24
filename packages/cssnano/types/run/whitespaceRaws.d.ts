import type { ArenaIndex } from '../ir/blockRecord.js';
import type { TokenListId } from '../ir/tokenLists.js';
import type { BlockRecords } from '../ir/blockRecords.js';
import type { RunContext } from './runContext.js';
/** @import {ArenaIndex, BlockRecord} from '../ir/blockRecord.js' */
/** @import {DeclarationRecord} from '../ir/declarationRecord.js' */
/** @import {RuleRecord} from '../ir/ruleRecord.js' */
/** @import {TokenListId} from '../ir/tokenLists.js' */
/** @import {BlockRecords} from '../ir/blockRecords.js' */
/** @import {RunContext} from './runContext.js' */
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
 * The value of a declaration with the character after its last backslash. When
 * the value ends the block's text, the parser leaves that character in the
 * block's after raw. It moves into the value, so a merge that moves or appends
 * a declaration cannot let the backslash take the `;` or `}`. The character
 * stays out of an important declaration, whose flag follows its value.
 *
 * @param {BlockRecords} records
 * @param {RunContext} run
 * @param {ArenaIndex} index a declaration
 * @param {TokenListId} value the id of the declaration's value, without the comments that go
 * @returns {TokenListId} the id of the value with the character, or `value` when no escape is open
 */
export declare function withBlockEscape(records: BlockRecords, run: RunContext, index: ArenaIndex, value: TokenListId): TokenListId;
/**
 * The folded value with the character its final backslash had before the fold.
 * A stage may trim the newline that makes the backslash an invalid escape, and
 * the backslash would then escape the `;` or `}` after it.
 *
 * @param {RunContext} run
 * @param {string} prop the declaration's property
 * @param {TokenListId} escaped the value with the character `withBlockEscape` gave it
 * @param {TokenListId} folded the value the stages folded `escaped` to
 * @returns {TokenListId} the id of the folded value with the character, or `folded` when it keeps one
 */
export declare function withEscapeKept(run: RunContext, prop: string, escaped: TokenListId, folded: TokenListId): TokenListId;
//# sourceMappingURL=whitespaceRaws.d.ts.map