export type Options = {
    /**
     * Discards unused font face rules. (default: true)
     */
    fontFace?: boolean;
    /**
     * Discards unused counter style rules. (default: true)
     */
    counterStyle?: boolean;
    /**
     * Discards unused keyframe rules. (default: true)
     */
    keyframes?: boolean;
    /**
     * Discards unused namespace rules. (default: true)
     */
    namespace?: boolean;
};
/**
 * @param {Options} opts
 * @return {import('postcss').Plugin}
 */
declare function pluginCreator(opts: Options): import('postcss').Plugin;
declare namespace pluginCreator {
    var postcss: true;
}
declare const moduleExports: typeof pluginCreator;
export { moduleExports as default, moduleExports as 'module.exports' };
//# sourceMappingURL=index.d.ts.map