export type CSSToken = import('@csstools/css-tokenizer').CSSToken;
export type CommentRemover = import('./commentRemover.js').default;
/**
 * Reconstruct a value with comments removed or preserved. Kept comments
 * pass through byte-exact; removal decisions consult the per-document
 * remover.
 *
 * @param {string | undefined} rawSource
 * @param {CommentRemover} remover
 * @param {Map<string, CSSToken[]>} parserCache
 * @param {string=} separator
 * @param {boolean=} preserveWhitespace
 * @return {string}
 */
export declare function replaceComments(rawSource: string | undefined, remover: CommentRemover, parserCache: Map<string, CSSToken[]>, separator?: string | undefined, preserveWhitespace?: boolean | undefined): string;
/**
 * Reconstruct a selector with comments removed or preserved. Whitespace
 * runs collapse to a single space and trim at the edges; kept comments
 * pass through byte-exact.
 *
 * @param {string | undefined} rawSource
 * @param {CommentRemover} remover
 * @param {Map<string, CSSToken[]>} parserCache
 * @return {string}
 */
export declare function replaceCommentsInSelector(rawSource: string | undefined, remover: CommentRemover, parserCache: Map<string, CSSToken[]>): string;
//# sourceMappingURL=replaceComments.d.ts.map