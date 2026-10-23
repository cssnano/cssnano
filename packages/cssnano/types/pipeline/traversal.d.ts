import type { Container, Document, Helpers, Root } from 'postcss';
import type { Reducer, Stage, TextReducer } from './host.js';
export type PropertyEntry = {
    plan: readonly Reducer[] | null;
    memos: (Map<string, string> | undefined)[];
};
export type TextEntry = {
    plan: readonly TextReducer[] | null;
    memos: (Map<string, string> | undefined)[];
};
export type RunState = {
    /**
     * in pipeline order
     */
    stages: readonly Stage[];
    properties: Map<string, PropertyEntry>;
    /**
     * by at-rule name
     */
    atRules: Map<string, TextEntry>;
    selectors: TextEntry;
    contexts: WeakMap<Container | Document, number>;
    helpers: Helpers;
};
/**
 * Runs the value, prelude and selector parts of the stages over a stylesheet in
 * a single walk, in document order. Each text is read from its source, folded
 * through its plan with its context, and written back only when it changed.
 *
 * @param {readonly Stage[]} stages in pipeline order
 * @returns {{run: (root: Root, helpers: Helpers) => void}}
 */
export declare function declarationTraversal(stages: readonly Stage[]): {
    run: (root: Root, helpers: Helpers) => void;
};
//# sourceMappingURL=traversal.d.ts.map