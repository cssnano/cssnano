declare const TokenType: typeof import("@csstools/css-tokenizer").TokenType;
export type CSSToken = import('@csstools/css-tokenizer').CSSToken;
/** @typedef {import('@csstools/css-tokenizer').CSSToken} CSSToken */
/** @type {(value: string) => CSSToken[]} */
declare const sharedTokens: (value: string) => CSSToken[];
export type TokenPosition = 'bare' | 'bracketed' | 'argument' | 'nested' | 'other';
export type Frame = {
    arguments?: number[];
    index: number;
    close: string;
    name?: string;
    substitution?: boolean;
};
export type Walk = {
    frames: Frame[];
    substitutions: number;
};
/**
 * Return the decoded identifier an at-rule's params hold, such as an
 * `@keyframes` name. Params stay raw, so tokenize them before matching
 * references.
 *
 * @param {string} params
 * @return {string | undefined}
 */
declare function atRuleIdent(params: string): string | undefined;
/**
 * Walk a value's tokens in source order and let the callback replace
 * spellings; each token's position tells where it sits.
 *
 * @param {string} value
 * @param {(token: CSSToken, position: TokenPosition) => string|undefined} callback
 * @param {Map<string, number[]>} [functions]
 * @param {CSSToken[]} [parsedTokens]
 * @return {string}
 */
declare function rewrite(value: string, callback: (token: CSSToken, position: TokenPosition) => string | undefined, functions?: Map<string, number[]>, parsedTokens?: CSSToken[]): string;
/**
 * Collect into a set the identifiers a value names from positions no grammar
 * defines. Leave those names unrenamed.
 *
 * @param {string} value
 * @param {Set<string>} into
 * @param {CSSToken[]} [parsedTokens]
 */
declare function collectOpaqueIdents(value: string, into: Set<string>, parsedTokens?: CSSToken[]): void;
export { TokenType, atRuleIdent, collectOpaqueIdents, rewrite, sharedTokens as tokens, };
//# sourceMappingURL=value.d.ts.map