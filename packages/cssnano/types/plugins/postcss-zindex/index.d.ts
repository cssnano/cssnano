import type { SymbolLists } from '../../pipeline/symbolLists.js';
export type Options = {
    /**
     * The first positive integer z-index to assign, so z-indices from other sources can be overridden. (default: 1)
     */
    startIndex?: number;
};
/** @import {SymbolLists} from '../../pipeline/symbolLists.js' */
/**
 * @typedef {object} Options
 * @property {number} [startIndex] The first positive integer z-index to assign, so z-indices from other sources can be overridden. (default: 1)
 */
/**
 * Rebases the z-index values of the walk after merge's lists to small
 * integers that keep their order. Rebasing is only safe when every index is
 * a positive number, so one negative value leaves them all alone.
 *
 * @param {SymbolLists} lists
 * @param {Options} options
 * @return {void}
 */
export declare function zindexSymbols(lists: SymbolLists, options: Options): void;
/**
 * @param {Options} opts
 * @return {import('postcss').Plugin}
 */
declare function pluginCreator(opts?: Options): import('postcss').Plugin;
declare namespace pluginCreator {
    var postcss: true;
}
declare const moduleExports: typeof pluginCreator;
export { moduleExports as default, moduleExports as 'module.exports' };
//# sourceMappingURL=index.d.ts.map