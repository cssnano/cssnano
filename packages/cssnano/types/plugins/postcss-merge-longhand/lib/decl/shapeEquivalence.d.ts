import type { CSSToken } from '@csstools/css-tokenizer';
export declare const transformFunctions: Set<string>;
export type NumericData = {
    value: number;
    unit?: string;
    type?: string;
};
/**
 * A string that two values share exactly when a browser that accepts one
 * must accept the other. Magnitudes are left out where they may vary, and
 * hex colours share a key whatever their valid length, except where the
 * property has fixed numbers.
 *
 * @param {string} value
 * @param {string} prop - lowercased
 * @param {Map<string, CSSToken[]>} [cache] - tokenization memo
 * @return {string | undefined} the key, or undefined when the value is
 * incomparable: unbalanced parentheses, a bad string or URL, or a token
 * the model does not cover
 */
export declare function shapeKey(value: string, prop: string, cache?: Map<string, CSSToken[]>): string | undefined;
/**
 * Older parsers reject scientific notation, so a value that uses it cannot
 * override one that does not, even where the shape is otherwise trusted.
 *
 * @param {string} value
 * @param {Map<string, CSSToken[]>} [cache] - tokenization memo
 * @return {boolean}
 */
export declare function hasScientificNotation(value: string, cache?: Map<string, CSSToken[]>): boolean;
/**
 * Whether a browser that accepts `earlierValue` for `prop` must also accept
 * `laterValue`, so the earlier declaration can never serve as a fallback.
 * Only magnitudes may differ; keywords, units and token types may not.
 *
 * @param {string} earlierValue
 * @param {string} laterValue
 * @param {string} prop
 * @param {Map<string, CSSToken[]>} [cache] - tokenization memo
 * @return {boolean}
 */
export declare function isShapeEquivalent(earlierValue: string, laterValue: string, prop: string, cache?: Map<string, CSSToken[]>): boolean;
//# sourceMappingURL=shapeEquivalence.d.ts.map