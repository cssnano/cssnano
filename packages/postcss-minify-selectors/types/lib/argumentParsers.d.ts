export type CSSToken = import('./tokenUtils.js').CSSToken;
export type Specificity = import('./arena.js').Specificity;
/** @typedef {import('./tokenUtils.js').CSSToken} CSSToken */
/** @typedef {import('./arena.js').Specificity} Specificity */
/** @param {string} kind @return {string | undefined} */
export declare function firstPseudoReplacement(kind: string): string | undefined;
export { parseAnPlusB } from './anPlusB.js';
/**
 * @param {readonly CSSToken[]} tokens
 * @param {number} start
 * @param {number} end
 * @return {{ pieces?: string[], specificity?: Specificity, valid: boolean }}
 */
export declare function normalizePtNameArgument(tokens: readonly CSSToken[], start: number, end: number): {
    pieces?: string[];
    specificity?: Specificity;
    valid: boolean;
};
/**
 * @param {readonly CSSToken[]} tokens
 * @param {number} start
 * @param {number} end
 * @return {{ pieces?: string[], valid: boolean }}
 */
export declare function normalizeIdentListArgument(tokens: readonly CSSToken[], start: number, end: number): {
    pieces?: string[];
    valid: boolean;
};
/**
 * @param {readonly CSSToken[]} tokens
 * @param {number} start
 * @param {number} end
 * @return {{ pieces?: string[], valid: boolean }}
 */
export declare function normalizeIdentArgument(tokens: readonly CSSToken[], start: number, end: number): {
    pieces?: string[];
    valid: boolean;
};
/**
 * @param {readonly CSSToken[]} tokens
 * @param {number} start
 * @param {number} end
 * @return {{ pieces?: string[], valid: boolean }}
 */
export declare function normalizeIdentOrStringList(tokens: readonly CSSToken[], start: number, end: number): {
    pieces?: string[];
    valid: boolean;
};
/**
 * Parsers of the pseudo-class and pseudo-element arguments that are
 * normalized as token pieces, keyed by the grammar name in `selectorGrammar`.
 * @type {ReadonlyMap<string, (tokens: readonly CSSToken[], start: number, end: number) => { pieces?: string[], specificity?: Specificity, valid: boolean }>}
 */
export declare const pieceArgumentParsers: ReadonlyMap<string, (tokens: readonly CSSToken[], start: number, end: number) => {
    pieces?: string[];
    specificity?: Specificity;
    valid: boolean;
}>;
//# sourceMappingURL=argumentParsers.d.ts.map