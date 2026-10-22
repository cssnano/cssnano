import type { Value } from '../values/value.js';
import type { PhaseStage, ValueStage } from './host.js';
export type Memo = Map<Value, Value>;
/**
 * Runs the value stages of one run over the declarations of a stylesheet in a
 * single walk. Each declaration reads its source text, folds it through the
 * plan of its property, and writes the result only when it changed.
 *
 * @param {readonly ValueStage[]} stages in pipeline order
 * @param {{memoise?: boolean}} [options] `memoise: false` folds every
 *   declaration, which checks that the memo only saves work
 * @returns {PhaseStage}
 */
export declare function declarationTraversal(stages: readonly ValueStage[], { memoise }?: {
    memoise?: boolean;
}): PhaseStage;
//# sourceMappingURL=traversal.d.ts.map