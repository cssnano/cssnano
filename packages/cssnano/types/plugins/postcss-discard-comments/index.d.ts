export type CSSToken = import('@csstools/css-tokenizer').CSSToken;
export type Options = {
    /**
     * Removes comments marked as important (`/*!`) too. (default: false)
     */
    removeAll?: boolean | undefined;
    /**
     * Removes comments marked as important, except the first one. (default: false)
     */
    removeAllButFirst?: boolean | undefined;
    /**
     * Returns true to remove a comment. Receives the comment text without its delimiters.
     */
    remove?: ((s: string) => boolean) | undefined;
};
/**
 * @param {Options} [opts]
 * @return {import('postcss').Plugin}
 */
declare function pluginCreator(opts?: Options): import('postcss').Plugin;
declare namespace pluginCreator {
    var postcss: true;
}
declare const moduleExports: typeof pluginCreator;
export { moduleExports as default, moduleExports as 'module.exports' };
//# sourceMappingURL=index.d.ts.map