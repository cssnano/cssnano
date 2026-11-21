export type CSSToken = import('@csstools/css-tokenizer').CSSToken;
export type Tokens = readonly CSSToken[];
export type CanRemove = (comment: string) => boolean | undefined;
/**
 * Reconstruct a value with comments removed or preserved. Kept comments
 * pass through byte-exact; removal decisions consult the per-document
 * canRemove.
 *
 * The caller gives the tokens of a text with a comment in it, and the text is
 * returned as it is when it has none.
 *
 * @param {Tokens} tokens the tokens of the text, as written
 * @param {CanRemove} canRemove
 * @param {string=} separator
 * @param {boolean=} preserveWhitespace
 * @return {string}
 */
export declare function replaceComments(tokens: Tokens, canRemove: CanRemove, separator?: string | undefined, preserveWhitespace?: boolean | undefined): string;
/**
 * Reconstruct a selector with comments removed or preserved. Whitespace
 * runs collapse to a single space and trim at the edges; kept comments
 * pass through byte-exact.
 *
 * @param {Tokens} tokens the tokens of the selector, as written
 * @param {CanRemove} canRemove
 * @return {string}
 */
export declare function replaceCommentsInSelector(tokens: Tokens, canRemove: CanRemove): string;
//# sourceMappingURL=replaceComments.d.ts.map