import type { DeclarationKeys } from '../../../ir/declarationKey.js';
export type Interner = {
    declarations: DeclarationKeys;
    ids: WeakMap<import('postcss').AnyNode, number>;
    layered: Set<number>;
};
export type Scope = {
    decls?: Map<number, import('postcss').AnyNode>;
    ruleDecls?: Map<string, Map<number, import('postcss').AnyNode>>;
    children?: Map<string, Scope>;
};
/**
 * Removes duplicate rules, declarations and at-rules from the tree.
 * @param {import('postcss').Root} css
 * @param {import('../../../ir/runContext.js').RunContext} [context] the run's state, shared with rule merging
 * @return {void}
 */
export declare function discardDuplicates(css: import('postcss').Root, context?: import('../../../ir/runContext.js').RunContext): void;
//# sourceMappingURL=discardDuplicates.d.ts.map