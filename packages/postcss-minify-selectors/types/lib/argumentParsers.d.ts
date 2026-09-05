export type CSSToken = import('./tokenUtils.js').CSSToken;
export type Specificity = import('./specificity.js').Specificity;
export type FunctionResult = import('./foldToIs.js').FunctionResult;
/** @typedef {import('./tokenUtils.js').CSSToken} CSSToken */
/** @typedef {import('./specificity.js').Specificity} Specificity */
/** @typedef {import('./foldToIs.js').FunctionResult} FunctionResult */
/** @param {string} kind @return {string | undefined} */
export declare function firstPseudoReplacement(kind: string): string | undefined;
/**
 * Parse the CSS Syntax An+B microsyntax from a complete token span.
 * @param {readonly CSSToken[]} tokens
 * @param {number} start
 * @param {number} end
 * @return {{ isTwoNPlusOne: boolean } | undefined}
 */
export declare function parseAnPlusB(tokens: readonly CSSToken[], start: number, end: number): {
    isTwoNPlusOne: boolean;
} | undefined;
/**
 * @param {readonly CSSToken[]} tokens
 * @param {number} start
 * @param {number} end
 * @return {{ pieces?: (string | FunctionResult)[], specificity?: Specificity, valid: boolean }}
 */
export declare function normalizePtNameArgument(tokens: readonly CSSToken[], start: number, end: number): {
    pieces?: (string | FunctionResult)[];
    specificity?: Specificity;
    valid: boolean;
};
/**
 * @param {readonly CSSToken[]} tokens
 * @param {number} start
 * @param {number} end
 * @return {{ pieces?: (string | FunctionResult)[], valid: boolean }}
 */
export declare function normalizeIdentListArgument(tokens: readonly CSSToken[], start: number, end: number): {
    pieces?: (string | FunctionResult)[];
    valid: boolean;
};
/**
 * @param {readonly CSSToken[]} tokens
 * @param {number} start
 * @param {number} end
 * @return {{ pieces?: (string | FunctionResult)[], valid: boolean }}
 */
export declare function normalizeIdentArgument(tokens: readonly CSSToken[], start: number, end: number): {
    pieces?: (string | FunctionResult)[];
    valid: boolean;
};
/**
 * @param {readonly CSSToken[]} tokens
 * @param {number} start
 * @param {number} end
 * @return {{ pieces?: (string | FunctionResult)[], valid: boolean }}
 */
export declare function normalizeIdentOrStringList(tokens: readonly CSSToken[], start: number, end: number): {
    pieces?: (string | FunctionResult)[];
    valid: boolean;
};
//# sourceMappingURL=argumentParsers.d.ts.map