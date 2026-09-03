export type Term = {
    raw: string;
    tokens: import('@csstools/css-tokenizer').CSSToken[];
};
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
/**
 * Tokenize a declaration once and split it at top-level whitespace and commas.
 * Nested functions and simple blocks remain one term, including their raw source.
 *
 * @param {string} value
 * @return {{ arguments: Term[][], terms: Term[], abort: boolean, value: string }}
 */
declare function tokenizeValue(value: string): {
    arguments: Term[][];
    terms: Term[];
    abort: boolean;
    value: string;
};
/** @param {Term[][]} arguments_ */
declare function serializeArguments(arguments_: Term[][]): string;
export { isDimension, isFunction, isIdent, isNumber, isUrl, name, serializeArguments, tokenizeValue, };
//# sourceMappingURL=tokenize.d.ts.map