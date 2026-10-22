import type { Value } from '../values/value.js';
import type { PhaseStage, ValueStage } from './host.js';
export type Memo = Map<Value, Value>;
/**
 * Runs the value stages of one run over the declarations of a stylesheet in a
 * single walk. Each declaration reads its source text, folds it through the
 * plan of its property, and writes the result only when it changed.
 *
 * @param {readonly ValueStage[]} stages in pipeline order
 * @returns {PhaseStage}
 */
export declare function declarationTraversal(stages: readonly ValueStage[]): PhaseStage;
//# sourceMappingURL=traversal.d.ts.map