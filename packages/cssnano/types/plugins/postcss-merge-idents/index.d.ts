import type { ChildNode } from 'postcss';
import type { SymbolLists } from '../../pipeline/symbolLists.js';
import type { TextTable as TextTableType } from '../../values/textTable.js';
export type Group = Array<{
    name: string;
    copies: AtRuleEntry[];
}>;
export type AtRuleEntry = {
    rule: import('postcss').AtRule;
    body?: string;
    layerPriority: number[];
    documentIndex: number;
    family: string;
    containerId: number;
    layerKey?: string;
    parsed: {
        isString: boolean;
        isReservedName: boolean;
        key: string;
        tokenText: string;
    };
};
/**
 * Merges the names of the advanced transform's lists. The walk after merge
 * collects the lists, so the transform needs no walk of its own.
 *
 * @param {SymbolLists} lists
 * @param {Record<PropertyKey, unknown>} _options takes no options
 * @param {(node: ChildNode) => void} remove
 * @param {TextTableType} table the text the walk stored
 * @return {void}
 */
export declare function mergeIdentsSymbols(lists: SymbolLists, _options: Record<PropertyKey, unknown>, remove: (node: ChildNode) => void, table: TextTableType): void;
/**
 * @return {import('postcss').Plugin}
 */
declare function pluginCreator(): import('postcss').Plugin;
declare namespace pluginCreator {
    var postcss: true;
}
declare const moduleExports: typeof pluginCreator;
export { moduleExports as default, moduleExports as 'module.exports' };
//# sourceMappingURL=index.d.ts.map