import type { Stage } from './host.js';
import type { PlanEntry } from './plan.js';
/** @import {Stage} from './host.js' */
/** @import {PlanEntry, PlanStep} from './plan.js' */
/**
 * The plan of an at-rule name: the prelude steps of the stages that rewrite
 * it, and whether one of them tightens the space after the name.
 *
 * @param {readonly Stage[]} stages in pipeline order
 * @param {string} name
 * @returns {PlanEntry}
 */
export declare function atRuleEntry(stages: readonly Stage[], name: string): PlanEntry;
//# sourceMappingURL=prelude.d.ts.map