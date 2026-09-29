import cssnanoUtils from 'cssnano-utils';
declare const TokenType: typeof import("@csstools/css-tokenizer").TokenType;
declare const decoded: typeof cssnanoUtils.decoded;
declare const tokenEnd: typeof cssnanoUtils.tokenEnd;
export type Tokens = Exclude<ReturnType<typeof cssnanoUtils.balancedTokens>, undefined>['tokens'];
/** @typedef {Exclude<ReturnType<typeof cssnanoUtils.balancedTokens>, undefined>['tokens']} Tokens */
export { TokenType, decoded, tokenEnd };
/**
 * Reports whether a value ends in a backslash that begins an escape
 * sequence, as opposed to a backslash that is itself escaped.
 * @param {string} value
 * @return {boolean}
 */
export declare function endsWithEscapingBackslash(value: string): boolean;
export declare const openingTypes: Set<import("@csstools/css-tokenizer").TokenType>;
export declare const closingTypes: Set<import("@csstools/css-tokenizer").TokenType>;
export declare const calcProductEndTypes: Set<import("@csstools/css-tokenizer").TokenType>;
export declare const calcProductStartTypes: Set<import("@csstools/css-tokenizer").TokenType>;
export declare const mathFunctions: Set<string>;
export declare const whitespaceInsensitiveFunctions: Set<string>;
export declare const aspectRatioFeatures: Set<string>;
/**
 * @param {string} left
 * @param {string} right
 * @return {[string, string] | undefined}
 */
export declare function aspectRatio(left: string, right: string): [string, string] | undefined;
/** @param {Tokens} input @param {number} index @param {number} step @return {number} */
export declare function significantIndex(input: Tokens, index: number, step: number): number;
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