import type { CSSToken } from '@csstools/css-tokenizer';
import type { TokenEdit } from '../../../values/valueBuffer.js';
export type HackTail = {
    run: string;
    next: string;
};
/**
 * Whether a whitespace run that follows a hack is dropped before `next`.
 *
 * @param {string} next the character after the run
 * @return {boolean}
 */
declare function isSeparatedByDelimiter(next: string): boolean;
/**
 * Whether the token text ends with a `\9` escape and the space it folds in,
 * so the whitespace token after it is the run the hack removes.
 *
 * @param {CSSToken} token
 * @return {boolean}
 */
declare function endsWithHack(token: CSSToken): boolean;
/**
 * Whether the token text starts with a `\9` escape, so the whitespace token
 * before it is the run the hack removes.
 *
 * @param {CSSToken | undefined} token
 * @return {boolean}
 */
declare function startsWithHack(token: CSSToken | undefined): boolean;
/**
 * The whitespace after a token and the first character of the text after it,
 * read from the tokens that follow `index`.
 *
 * @param {readonly CSSToken[]} tokens
 * @param {number} index
 * @return {HackTail}
 */
declare function hackTail(tokens: readonly CSSToken[], index: number): HackTail;
/**
 * The token with the text given and the data kept. The text must read back
 * as the same token, such as a token whose escape loses a folded space.
 *
 * @param {CSSToken} token
 * @param {string} text
 * @return {CSSToken}
 */
declare function respelled(token: CSSToken, text: string): CSSToken;
/**
 * @param {number} index
 * @param {CSSToken[]} tokens the tokens that replace the one at `index`
 * @return {TokenEdit}
 */
declare function replaceToken(index: number, tokens: CSSToken[]): TokenEdit;
/**
 * Pushes the edit that unhacks the token at `index`: the token respelled, or
 * joined to the token before the whitespace the hack drops.
 *
 * @param {TokenEdit[]} edits
 * @param {readonly CSSToken[]} tokens
 * @param {number} index
 */
declare function unhack(edits: TokenEdit[], tokens: readonly CSSToken[], index: number): void;
export { endsWithHack, hackTail, isSeparatedByDelimiter, replaceToken, respelled, startsWithHack, unhack, };
//# sourceMappingURL=ieHack.d.ts.map