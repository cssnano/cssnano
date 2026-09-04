import cssnanoUtils from 'cssnano-utils';
export type CSSToken = ReturnType<typeof cssnanoUtils.balancedTokens> extends infer Structure ? Structure extends {
    tokens: readonly (infer Token)[];
} ? Token : never : never;
/** @typedef {ReturnType<typeof cssnanoUtils.balancedTokens> extends infer Structure ? Structure extends {tokens: readonly (infer Token)[]} ? Token : never : never} CSSToken */
/** @param {string} value */
export declare function unquote(value: string): string;
/** @param {CSSToken | undefined} token */
export declare function isCombinator(token: CSSToken | undefined): boolean;
/** @param {readonly CSSToken[]} tokens @param {number} index */
export declare function isColumnCombinator(tokens: readonly CSSToken[], index: number): boolean;
/** @param {readonly CSSToken[]} tokens @param {number} index */
export declare function isDeepBoundary(tokens: readonly CSSToken[], index: number): boolean;
/** @param {{operator: boolean, value: boolean} | undefined} attribute @param {CSSToken | undefined} previous @param {CSSToken | undefined} next */
export declare function keepWhitespace(attribute: {
    operator: boolean;
    value: boolean;
} | undefined, previous: CSSToken | undefined, next: CSSToken | undefined): boolean;
//# sourceMappingURL=tokenUtils.d.ts.map