import type { PhaseStage, ValueStage } from './host.js';
/** @import {PhaseStage, Reducer, ValueStage} from './host.js' */
/**
 * Runs the value stages of one run over the declarations of a stylesheet in a
 * single walk. Each declaration reads its source text, folds it through the
 * plan of its property, and writes the result only when it changed. A value
 * that reports a warning is not memoised, so each declaration reports it.
 *
 * @param {readonly ValueStage[]} stages in pipeline order
 * @returns {PhaseStage}
 */
export declare function declarationTraversal(stages: readonly ValueStage[]): PhaseStage;
//# sourceMappingURL=traversal.d.ts.map