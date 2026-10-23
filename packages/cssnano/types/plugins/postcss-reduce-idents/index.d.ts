import type { SymbolLists } from '../../pipeline/symbolLists.js';
export type Options = {
    /**
     * Reduces `content`, `counter-reset` and `counter-increment` declarations. (default: true)
     */
    counter?: boolean;
    /**
     * Reduces `counter-style` rules and `list-style` and `system` declarations. (default: true)
     */
    counterStyle?: boolean;
    /**
     * Reduces `keyframes` rules and `animation` declarations. (default: true)
     */
    keyframes?: boolean;
    /**
     * Reduces `grid-template`, `grid-area`, `grid-column`, `grid-row` and `grid-template-areas` declarations. (default: true)
     */
    gridTemplate?: boolean;
    /**
     * Replaces a name. Receives the name and how many names came before it.
     */
    encoder?: (value: string, index: number) => string;
};
export type Reducer = {
    collect: (node: import('postcss').AnyNode) => void;
    transform: () => void;
};
/**
 * Renames the names that the walk after merge collected. Each reducer reads
 * only at-rules or declarations, so the lists hold every node it needs, and a
 * node that an earlier transform detached is skipped.
 *
 * @param {SymbolLists} lists
 * @param {Options} options
 * @return {void}
 */
export declare function reduceIdentsSymbols(lists: SymbolLists, options: Options): void;
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