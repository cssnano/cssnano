import cssnanoUtils from 'cssnano-utils';
/** @type {typeof cssnanoUtils.balancedTokens} */
declare const balancedTokens: typeof cssnanoUtils.balancedTokens;
export type CSSToken = ReturnType<typeof balancedTokens> extends infer Structure ? Structure extends {
    tokens: readonly (infer Token)[];
} ? Token : never : never;
/** @return {import('postcss').Plugin} */
declare function pluginCreator(): import('postcss').Plugin;
declare namespace pluginCreator {
    var postcss: true;
}
export { pluginCreator as default, pluginCreator as 'module.exports' };
//# sourceMappingURL=index.d.ts.map