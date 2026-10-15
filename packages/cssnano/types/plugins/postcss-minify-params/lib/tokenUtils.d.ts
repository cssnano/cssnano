import cssnanoUtils from '#utils';
declare const TokenType: typeof import("@csstools/css-tokenizer").TokenType;
declare const decoded: typeof cssnanoUtils.decoded;
declare const tokenEnd: typeof cssnanoUtils.tokenEnd;
export type Tokens = Exclude<ReturnType<typeof cssnanoUtils.balancedTokens>, undefined>['tokens'];
/** @typedef {Exclude<ReturnType<typeof cssnanoUtils.balancedTokens>, undefined>['tokens']} Tokens */
export { TokenType, decoded, tokenEnd };
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
 * Whether the token at `index` is whitespace or a comment, which a query may
 * place between any two significant tokens.
 *
 * @param {Tokens} input
 * @param {number} index
 * @return {boolean}
 */
export declare function isWhitespaceOrComment(input: Tokens, index: number): boolean;
/** @param {Tokens} input @param {number} index @param {number} step @return {number} */
export declare function significantIndex(input: Tokens, index: number, step: number): number;
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
/**
 * @param {string} source
 * @param {{start:number,end:number}[]} segments
 * @param {{start:number,end:number,text:string}[]} edits
 * @return {string[]}
 */
export declare function serializeSegments(source: string, segments: {
    start: number;
    end: number;
}[], edits: {
    start: number;
    end: number;
    text: string;
}[]): string[];
//# sourceMappingURL=tokenUtils.d.ts.map