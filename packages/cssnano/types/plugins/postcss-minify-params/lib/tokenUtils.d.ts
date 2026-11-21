import cssnanoUtils from '#utils';
declare const TokenType: typeof import("@csstools/css-tokenizer").TokenType, isTrivia: typeof import("../../../utils/value.js").isTrivia, skipTrivia: typeof import("../../../utils/value.js").skipTrivia;
declare const decoded: typeof cssnanoUtils.decoded;
export type Tokens = Exclude<ReturnType<typeof cssnanoUtils.balancedTokens>, undefined>['tokens'];
/** @typedef {Exclude<ReturnType<typeof cssnanoUtils.balancedTokens>, undefined>['tokens']} Tokens */
export { TokenType, decoded, isTrivia, skipTrivia };
export declare const openingTypes: Set<import("@csstools/css-tokenizer").TokenType>;
export declare const closingTypes: Set<import("@csstools/css-tokenizer").TokenType>;
export declare const calcProductEndTypes: Set<import("@csstools/css-tokenizer").TokenType>;
export declare const calcProductStartTypes: Set<import("@csstools/css-tokenizer").TokenType>;
export declare const mathFunctions: ReadonlyMap<string, readonly [number, number]>;
export declare const whitespaceInsensitiveFunctions: Set<string>;
export declare const aspectRatioFeatures: Set<string>;
/**
 * Convert a CSS number spelling to an exact rational number.
 *
 * @param {string} source
 * @return {[bigint, bigint] | undefined}
 */
export declare function rational(source: string): [bigint, bigint] | undefined;
/**
 * @param {string} left
 * @param {string} right
 * @return {[string, string] | undefined}
 */
export declare function aspectRatio(left: string, right: string): [string, string] | undefined;
/**
 * The nearest token at or before `index` that is not whitespace or a comment,
 * or -1 when there is none.
 *
 * @param {Tokens} input
 * @param {number} index
 * @return {number}
 */
export declare function previousSignificantIndex(input: Tokens, index: number): number;
/**
 * Where the value of a `(name: value)` feature starts, for the `(` at `open`;
 * the name is the first significant token after it. Returns -1 unless an
 * identifier and a colon open the feature.
 *
 * @param {Tokens} input
 * @param {number} open
 * @return {number} the index of the first significant token after the colon
 */
export declare function featureValueIndex(input: Tokens, open: number): number;
//# sourceMappingURL=tokenUtils.d.ts.map