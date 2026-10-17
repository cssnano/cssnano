export type Options = {
    /**
     * Properties that keep their value, such as `min-height`. (default: none)
     */
    ignore?: string[];
};
/**
 * @typedef {object} Options
 * @property {string[]} [ignore] Properties that keep their value, such as `min-height`. (default: none)
 */
/**
 * @param {Options} options
 * @return {import('postcss').Plugin}
 */
declare function pluginCreator(options?: Options): import('postcss').Plugin;
declare namespace pluginCreator {
    var postcss: true;
}
declare const moduleExports: typeof pluginCreator;
export { moduleExports as default, moduleExports as 'module.exports' };
//# sourceMappingURL=index.d.ts.map