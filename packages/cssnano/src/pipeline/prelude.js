import { planEntry } from './plan.js';

/** @import {Reducer, Stage} from './host.js' */
/** @import {PlanEntry} from './plan.js' */

/**
 * The plan of an at-rule name: the prelude steps of the stages that rewrite
 * it, and whether one of them tightens the space after the name.
 *
 * @param {readonly Stage[]} stages in pipeline order
 * @param {string} name
 * @returns {PlanEntry}
 */
export function atRuleEntry(stages, name) {
  /** @type {Reducer[]} */
  const plan = [];
  let tightens = false;
  for (const stage of stages) {
    const part = stage.forAtRule?.(name) ?? null;
    if (part === null) continue;
    plan.push(part.buffer);
    tightens ||= part.tightensAfterName === true;
  }
  return planEntry(plan, undefined, null, tightens);
}
