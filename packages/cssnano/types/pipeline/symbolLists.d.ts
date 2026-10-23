import type { AnyNode, AtRule, Declaration, Rule } from 'postcss';
export type SymbolLists = {
    /**
     * `@font-face` blocks
     */
    fontFaces: AtRule[];
    /**
     * `@counter-style` at-rules
     */
    counterStyles: AtRule[];
    /**
     * `@keyframes` at-rules
     */
    keyframes: AtRule[];
    /**
     * `@namespace` at-rules
     */
    namespaces: AtRule[];
    /**
     * rules whose selector has a namespace bar
     */
    namespaceRules: Rule[];
    /**
     * `font` and `font-family` declarations in a rule
     */
    fontDecls: Declaration[];
    /**
     * `list-style` and `system` declarations
     */
    listStyleDecls: Declaration[];
    /**
     * `animation` declarations
     */
    animationDecls: Declaration[];
    /**
     * `z-index` declarations
     */
    zIndexDecls: Declaration[];
};
/**
 * The nodes that the advanced transforms read, by kind. The walk after merge
 * fills them, so each transform edits lists rather than walking the tree.
 *
 * @typedef {object} SymbolLists
 * @property {AtRule[]} fontFaces `@font-face` blocks
 * @property {AtRule[]} counterStyles `@counter-style` at-rules
 * @property {AtRule[]} keyframes `@keyframes` at-rules
 * @property {AtRule[]} namespaces `@namespace` at-rules
 * @property {Rule[]} namespaceRules rules whose selector has a namespace bar
 * @property {Declaration[]} fontDecls `font` and `font-family` declarations in a rule
 * @property {Declaration[]} listStyleDecls `list-style` and `system` declarations
 * @property {Declaration[]} animationDecls `animation` declarations
 * @property {Declaration[]} zIndexDecls `z-index` declarations
 */
/**
 * @returns {SymbolLists}
 */
export declare function createSymbolLists(): SymbolLists;
/**
 * Sorts one kept node into the lists it belongs to. Names are matched the way
 * the transforms match them, so a list holds exactly what they would find.
 *
 * @param {SymbolLists} lists
 * @returns {(node: AnyNode) => void}
 */
export declare function symbolVisit(lists: SymbolLists): (node: AnyNode) => void;
//# sourceMappingURL=symbolLists.d.ts.map