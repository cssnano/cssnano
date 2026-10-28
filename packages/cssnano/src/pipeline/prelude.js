import { planEntry } from './plan.js';

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
export function atRuleEntry(stages, name) {
  /** @type {PlanStep[]} */
  const plan = [];
  let tightens = false;
  for (const stage of stages) {
    const part = stage.forAtRule?.(name) ?? null;
    if (part === null) continue;
    if (typeof part === 'function') {
      plan.push({ text: part });
    } else {
      plan.push('buffer' in part ? part.buffer : { text: part.reduce });
      tightens ||= part.tightensAfterName === true;
    }
  }
  return planEntry(plan, undefined, null, tightens);
}
