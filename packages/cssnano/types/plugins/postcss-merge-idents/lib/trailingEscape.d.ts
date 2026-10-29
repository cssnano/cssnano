import type { TextTable } from '../../../values/textTable.js';
/**
 * @param {string} value
 * @return {boolean} whether the last backslash escapes nothing inside the
 *   value, i.e. the value ends in an odd number of backslashes
 */
declare function endsWithDanglingEscape(value: string): boolean;
/**
 * The tokens of an at-rule's prelude. A dangling backslash escapes the space
 * that PostCSS keeps in `raws.between`, so that space joins the prelude;
 * otherwise the between-block space holds only whitespace and comments, and
 * the stored list of the prelude stands for it.
 *
 * @param {import('postcss').AtRule} atRule
 * @param {TextTable} table
 * @return {readonly import('@csstools/css-tokenizer').CSSToken[]}
 */
declare function preludeTokens(atRule: import('postcss').AtRule, table: TextTable): readonly import('@csstools/css-tokenizer').CSSToken[];
/**
 * Restores the whitespace that PostCSS trims from a declaration value ending in
 * a backslash, so the value tokenizes as the browser reads it. A space or tab
 * after the backslash makes an escape; a newline leaves the backslash a delim,
 * which no rename removes.
 *
 * @param {import('postcss').Declaration} decl
 * @return {string | undefined} the value to tokenize and rewrite, or
 *   `undefined` when the code point after a trailing backslash is unknown
 */
declare function trailingEscape(decl: import('postcss').Declaration): string | undefined;
export { endsWithDanglingEscape, preludeTokens, trailingEscape };
//# sourceMappingURL=trailingEscape.d.ts.map