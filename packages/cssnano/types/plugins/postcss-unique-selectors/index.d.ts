import { TextTable } from '../../values/textTable.js';
import type { CSSToken } from '@csstools/css-tokenizer';
export type SelectorComment = {
    start: number;
    end: number;
    token: CSSToken;
    structuralWhitespace: boolean;
};
export type SelectorPart = {
    start: number;
    end: number;
    /**
     * the index of its first token
     */
    from: number;
    /**
     * the index after its last token
     */
    to: number;
    comments: SelectorComment[];
};
export type UniquePart = {
    part: SelectorPart;
    comments: CSSToken[];
};
/**
 * Removes the duplicate selectors of one rule, keeping its raw formatting.
 * The tokens of the selector come from `table`, so a list that a stage wrote
 * is not tokenized again.
 *
 * @param {import('postcss').Rule} rule
 * @param {TextTable} table
 * @return {void}
 */
export declare function uniqueRuleSelector(rule: import('postcss').Rule, table: TextTable): void;
/**
 * Visits one node of a walk; only rules have selectors to dedupe.
 *
 * @param {import('postcss').AnyNode} node
 * @param {TextTable} table
 * @return {void}
 */
export declare function uniqueSelectorsVisit(node: import('postcss').AnyNode, table: TextTable): void;
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