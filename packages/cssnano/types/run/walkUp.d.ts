import type { RunState } from './runDriver.js';
import type { RunPlan } from './hostPlan.js';
import type { LonghandRound } from '../merge/longhand/canonicalize.js';
/**
 * The walk up over the records, before the end of the run. The per-entry
 * transforms share one walk: normalizeWhitespace visits each entry, the symbol
 * lists and the charset scan collect what the later stage reads. With discardEmpty
 * on, the walk is post-order and discards empty entries; otherwise it is pre-order.
 * After the walk, the symbol transforms run in order over the lists, and then the
 * charset decision, all before the end writes the records.
 *
 * @param {RunState} state the build of the stylesheet, after the merge transforms
 * @param {RunPlan} plan the transforms of the run; its symbols run in entry order
 * @param {readonly string[]} [browsers] the targets the merge folded the summaries for; absent when it did not
 * @param {LonghandRound} [round] the longhand round of the run, whose second pass runs on each block the walk reaches
 * @return {void}
 */
export declare function walkUp(state: RunState, plan: RunPlan, browsers?: readonly string[], round?: LonghandRound): void;
//# sourceMappingURL=walkUp.d.ts.map