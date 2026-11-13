import type { ArenaIndex } from '../../../passes/ir/blockRecord.js';
import type { BlockRecords } from '../../../passes/ir/blockRecords.js';
import type { TokenLists } from '../../../passes/ir/tokenLists.js';
/**
 * The tokens of an at-rule's prelude. A dangling backslash escapes the space
 * that PostCSS keeps in `raws.between`, so that space joins the prelude;
 * otherwise the between-block space holds only whitespace and comments, and
 * the stored list of the prelude stands for it.
 *
 * @param {BlockRecords} records
 * @param {TokenLists} tokenLists
 * @param {ArenaIndex} index
 * @return {readonly import('@csstools/css-tokenizer').CSSToken[]}
 */
export declare function preludeTokens(records: BlockRecords, tokenLists: TokenLists, index: ArenaIndex): readonly import('@csstools/css-tokenizer').CSSToken[];
/**
 * Restores the whitespace that PostCSS trims from a declaration value ending in
 * a backslash, so the value tokenizes as the browser reads it. A space or tab
 * after the backslash makes an escape; a newline leaves the backslash a delim,
 * which no rename removes.
 *
 * @param {BlockRecords} records
 * @param {TokenLists} tokenLists
 * @param {ArenaIndex} index
 * @return {string | undefined} the value to tokenize and rewrite, or
 *   `undefined` when the code point after a trailing backslash is unknown
 */
export declare function trailingEscape(records: BlockRecords, tokenLists: TokenLists, index: ArenaIndex): string | undefined;
//# sourceMappingURL=trailingEscape.d.ts.map