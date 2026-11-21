import type { CSSToken } from '@csstools/css-tokenizer';
export type Term = {
    raw: string;
    tokens: import('@csstools/css-tokenizer').CSSToken[];
};
/**
 * A raw top-level component. Its source is intentionally never reserialized:
 * CSS escapes and malformed-but-tokenizable input must survive a rewrite.
 *
 * @typedef {{ raw: string, tokens: import('@csstools/css-tokenizer').CSSToken[] }} Term
 */
/** @param {Term} term */
declare function name(term: Term): string;
/** @param {Term} term */
declare function isDimension(term: Term): boolean;
/** @param {Term} term */
declare function isNumber(term: Term): boolean;
/** @param {Term} term */
declare function isFunction(term: Term): boolean;
/** @param {Term} term */
declare function isUrl(term: Term): boolean;
/** @param {Term} term */
declare function isIdent(term: Term): boolean;
/** @param {Term} term */
declare function isHash(term: Term): boolean;
/** @param {Term} term */
declare function isString(term: Term): boolean;
/** @param {Term} term */
declare function isPercentage(term: Term): boolean;
/** @param {Term} term @param {string} [char] */
declare function isDelim(term: Term, char?: string): boolean;
/**
 * Splits the tokens of a declaration at top-level whitespace, commas, and
 * structural slashes. A term's raw text is the text of its tokens, so terms
 * built from tokens an earlier stage made still read back as their text.
 *
 * @param {readonly import('@csstools/css-tokenizer').CSSToken[]} value the tokens of the value
 * @return {{ arguments: Term[][], terms: Term[], abort: boolean }}
 */
declare function tokenizeValue(value: readonly import('@csstools/css-tokenizer').CSSToken[]): {
    arguments: Term[][];
    terms: Term[];
    abort: boolean;
};
/**
 * The tokens of the groups in order, with `separator` between each pair. An
 * empty group adds nothing, so a caller drops the groups it does not keep.
 *
 * @param {readonly (readonly CSSToken[])[]} groups
 * @param {CSSToken} separator
 * @return {CSSToken[]}
 */
declare function joinTokens(groups: readonly (readonly CSSToken[])[], separator: CSSToken): CSSToken[];
/**
 * The tokens of a comma-separated list of arguments, each argument's terms
 * separated by whitespace.
 *
 * @param {Term[][]} arguments_
 * @return {CSSToken[]}
 */
declare function argumentTokens(arguments_: Term[][]): CSSToken[];
declare const reservedIdentKeywords: Set<string>;
export { argumentTokens, reservedIdentKeywords, isDelim, isDimension, isFunction, isHash, isIdent, isNumber, isPercentage, isString, isUrl, joinTokens, name, tokenizeValue, };
//# sourceMappingURL=tokenize.d.ts.map