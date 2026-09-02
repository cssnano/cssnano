import cssnanoUtils from 'cssnano-utils';
/** @type {typeof cssnanoUtils.balancedTokens} */
declare const balancedTokens: typeof cssnanoUtils.balancedTokens;
export type CSSToken = ReturnType<typeof balancedTokens> extends infer Structure ? Structure extends {
    tokens: readonly (infer Token)[];
} ? Token : never : never;
export type BalancedTokenStructure = NonNullable<ReturnType<typeof balancedTokens>>;
/** @param {string} source @param {boolean} [sort] @param {boolean} [convertToIs] @return {string} */
declare function normalizeList(source: string, sort?: boolean, convertToIs?: boolean): string;
/** @param {string} source @return {string[]} */
declare function splitList(source: string): string[];
export { normalizeList, splitList };
//# sourceMappingURL=selectorScanner.d.ts.map