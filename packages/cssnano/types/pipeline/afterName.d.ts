import type { CSSToken } from '@csstools/css-tokenizer';
import type { ArenaIndex } from '../passes/ir/blockRecord.js';
import type { BlockRecords } from '../passes/ir/blockRecords.js';
/**
 * Whether the space after an at-rule name can go for a prelude: its first token
 * is a parenthesis, and its brackets balance. A prelude's text starts with `(`
 * exactly when its first token is an open parenthesis.
 *
 * @param {readonly CSSToken[]} list the tokens that spell the prelude after the walk
 * @return {boolean}
 */
export declare function startsWithBalancedParen(list: readonly CSSToken[]): boolean;
/**
 * Sets the space after an at-rule name for the prelude that the walk wrote. An
 * empty prelude takes no space. A prelude that starts with a parenthesis takes
 * none either, unless its brackets do not balance, when the name's space is
 * left as written.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} index the at-rule's record
 * @param {boolean} empty whether the prelude after the walk is empty
 * @param {boolean} startsBalanced whether the prelude starts with a balanced
 *   parenthesis, as startsWithBalancedParen tells
 * @return {void}
 */
export declare function tightenAfterName(records: BlockRecords, index: ArenaIndex, empty: boolean, startsBalanced: boolean): void;
//# sourceMappingURL=afterName.d.ts.map