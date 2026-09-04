export type CSSToken = import('./tokenUtils.js').CSSToken;
export type Compound = import('./foldToIs.js').Compound;
/** @typedef {import('./tokenUtils.js').CSSToken} CSSToken */
/** @typedef {import('./foldToIs.js').Compound} Compound */
/**
 * @param {readonly CSSToken[]} tokens
 * @param {number} index
 * @return {{ value: string, length: number } | undefined}
 */
export declare function checkCombinatorToken(tokens: readonly CSSToken[], index: number): {
    value: string;
    length: number;
} | undefined;
/**
 * @param {{ output: (string | import('./foldToIs.js').FunctionResult)[] }} state
 * @param {readonly CSSToken[]} tokens
 * @param {number} start
 * @param {number} finish
 * @return {number}
 */
export declare function skipTriviaAfterCombinator(state: {
    output: (string | import('./foldToIs.js').FunctionResult)[];
}, tokens: readonly CSSToken[], start: number, finish: number): number;
/**
 * @param {readonly CSSToken[]} tokens
 * @param {number} start
 * @param {number} finish
 * @return {{ cursor: number, hasOrdinaryComment: boolean, importantIndices: number[] }}
 */
export declare function scanTriviaSegment(tokens: readonly CSSToken[], start: number, finish: number): {
    cursor: number;
    hasOrdinaryComment: boolean;
    importantIndices: number[];
};
/**
 * @param {{ output: (string | import('./foldToIs.js').FunctionResult)[] }} state
 * @param {readonly CSSToken[]} tokens
 * @param {number[]} importantIndices
 * @param {number} triviaStart
 */
export declare function appendImportantTrivia(state: {
    output: (string | import('./foldToIs.js').FunctionResult)[];
}, tokens: readonly CSSToken[], importantIndices: number[], triviaStart: number): void;
/**
 * @param {{ output: (string | import('./foldToIs.js').FunctionResult)[] }} state
 * @param {readonly CSSToken[]} tokens
 * @param {number} start
 * @param {number} finish
 * @param {boolean} preserveLeading
 * @param {Compound[]} compounds
 * @param {() => Compound} emptyCompoundFactory
 * @return {{ index: number, leadingCombinator: string | undefined }}
 */
export declare function consumeLeading(state: {
    output: (string | import('./foldToIs.js').FunctionResult)[];
}, tokens: readonly CSSToken[], start: number, finish: number, preserveLeading: boolean, compounds: Compound[], emptyCompoundFactory: () => Compound): {
    index: number;
    leadingCombinator: string | undefined;
};
//# sourceMappingURL=triviaScanner.d.ts.map