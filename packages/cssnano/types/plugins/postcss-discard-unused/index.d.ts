import { TextTable } from '../../values/textTable.js';
import type { AtRule } from 'postcss';
import type { SymbolLists } from '../../pipeline/symbolLists.js';
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
 * @typedef {object} Options
 * @property {boolean} [fontFace] Discards unused font face rules. (default: true)
 * @property {boolean} [counterStyle] Discards unused counter style rules. (default: true)
 * @property {boolean} [keyframes] Discards unused keyframe rules. (default: true)
 * @property {boolean} [namespace] Discards unused namespace rules. (default: true)
 */
/**
 * Removes the at-rules that define a name nothing references. Every reference
 * is read before the first removal, so a reference inside a removed at-rule
 * still keeps its definition.
 *
 * @param {SymbolLists} lists
 * @param {Options} options
 * @param {(node: AtRule) => void} remove
 * @param {TextTable} table the selector tokens the walk stored
 * @return {void}
 */
export declare function discardUnusedSymbols(lists: SymbolLists, options: Options, remove: (node: AtRule) => void, table: TextTable): void;
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