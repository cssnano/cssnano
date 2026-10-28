declare const TokenType: typeof import("@csstools/css-tokenizer").TokenType;
export type CSSToken = import('@csstools/css-tokenizer').CSSToken;
import type { TokenEdit } from '../../../values/valueBuffer.js';
/** @typedef {import('@csstools/css-tokenizer').CSSToken} CSSToken */
/** @import {TokenEdit} from '../../../values/valueBuffer.js' */
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
 * Return the decoded identifier an at-rule's prelude holds, such as an
 * `@keyframes` name, ignoring the whitespace and comments around it.
 *
 * @param {readonly CSSToken[]} parsedTokens the tokens of the prelude
 * @return {string | undefined}
 */
declare function atRuleIdent(parsedTokens: readonly CSSToken[]): string | undefined;
/**
 * Walk a value's tokens in source order and let the callback replace
 * spellings; each token's position tells where it sits.
 *
 * @param {string} value
 * @param {(token: CSSToken, position: TokenPosition) => string|undefined} callback
 * @param {Map<string, number[]>} [functions]
 * @param {readonly CSSToken[]} [parsedTokens]
 * @return {string}
 */
declare function rewrite(value: string, callback: (token: CSSToken, position: TokenPosition) => string | undefined, functions?: Map<string, number[]>, parsedTokens?: readonly CSSToken[]): string;
/**
 * Collect the edits that swap tokens for the tokens a callback returns. The
 * walk and the positions are the same as rewrite's.
 *
 * @param {readonly CSSToken[]} parsedTokens
 * @param {(token: CSSToken, position: TokenPosition) => CSSToken | undefined} callback
 * @param {Map<string, number[]>} [functions]
 * @return {TokenEdit[]}
 */
declare function tokenEdits(parsedTokens: readonly CSSToken[], callback: (token: CSSToken, position: TokenPosition) => CSSToken | undefined, functions?: Map<string, number[]>): TokenEdit[];
/**
 * Collect into a set the identifiers a value names from positions no grammar
 * defines. Leave those names unrenamed.
 *
 * @param {string} value
 * @param {Set<string>} into
 * @param {readonly CSSToken[]} [parsedTokens]
 */
declare function collectOpaqueIdents(value: string, into: Set<string>, parsedTokens?: readonly CSSToken[]): void;
export { TokenType, atRuleIdent, collectOpaqueIdents, rewrite, sharedTokens as tokens, tokenEdits, };
//# sourceMappingURL=value.d.ts.map