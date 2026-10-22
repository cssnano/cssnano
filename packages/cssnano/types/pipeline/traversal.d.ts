import type { Helpers, Root } from 'postcss';
import type { Reducer, Stage } from './host.js';
export type PropertyEntry = {
    plan: readonly Reducer[] | null;
    memos: (Map<string, string> | undefined)[] | null;
};
/**
 * Runs the value stages of one run over the declarations of a stylesheet in a
 * single walk. Each declaration reads its source text, folds it through the
 * plan of its property with its context, and writes the result only when it
 * changed. A value that reports a warning is not memoised, so each declaration
 * reports it.
 *
 * @param {readonly Stage[]} stages in pipeline order
 * @returns {{run: (root: Root, helpers: Helpers) => void}}
 */
export declare function declarationTraversal(stages: readonly Stage[]): {
    run: (root: Root, helpers: Helpers) => void;
};
//# sourceMappingURL=traversal.d.ts.map