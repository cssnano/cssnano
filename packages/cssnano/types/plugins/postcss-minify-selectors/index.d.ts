import { isInvalidSelector } from './lib/isInvalidSelector.js';
export type Options = {
    /**
     * Sorts the selectors of a list alphabetically. (default: true)
     */
    sort?: boolean;
    /**
     * Factors a shared prefix or suffix of a selector list into `:is()` when that is shorter and keeps the cascade. (default: true)
     */
    convertToIs?: boolean;
};
/**
 * Minify selectors from tokenizer spans. Function arguments are normalized
 * bottom-up without recursive descent.
 * @param {Options} opts
 * @return {import('postcss').Plugin}
 */
declare function pluginCreator(opts?: Options): import('postcss').Plugin;
declare namespace pluginCreator {
    var postcss: true;
}
declare const moduleExports: typeof pluginCreator;
export { moduleExports as default, moduleExports as 'module.exports', isInvalidSelector, };
//# sourceMappingURL=index.d.ts.map