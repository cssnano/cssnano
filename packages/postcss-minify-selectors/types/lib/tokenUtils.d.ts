export type CSSToken = ReturnType<typeof import('cssnano-utils').default.balancedTokens> extends infer Structure ? Structure extends {
    tokens: readonly (infer Token)[];
} ? Token : never : never;
/** @typedef {ReturnType<typeof import('cssnano-utils').default.balancedTokens> extends infer Structure ? Structure extends {tokens: readonly (infer Token)[]} ? Token : never : never} CSSToken */
/** @param {string} value */
export declare function unquote(value: string): string;
//# sourceMappingURL=tokenUtils.d.ts.map