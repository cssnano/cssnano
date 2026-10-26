/**
 * Whether a selector list is definitely invalid per Selectors 4, so that a
 * browser would drop any list it is part of. Constructs the parser cannot
 * classify, such as vendor-prefixed or unknown pseudos, are not reported.
 *
 * With `sourceTokens`, the selector is the range `start..end` of tokens that
 * spell `source`, so the selector is parsed without being tokenized again.
 *
 * @param {string} source the text of the list, or of the selector alone
 * @param {readonly import('@csstools/css-tokenizer').CSSToken[]} [sourceTokens]
 * @param {number} [start]
 * @param {number} [end]
 * @return {boolean}
 */
export declare function isInvalidSelector(source: string, sourceTokens?: readonly import('@csstools/css-tokenizer').CSSToken[], start?: number, end?: number): boolean;
//# sourceMappingURL=isInvalidSelector.d.ts.map