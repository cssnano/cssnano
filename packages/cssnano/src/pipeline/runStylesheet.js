import { walkUp } from './walkUp.js';
import { discardOverriddenAtRules } from './overridable.js';
import { walkDown } from './walkDown.js';
import rawCache from '../utils/rawCache.js';
import { createRunContext } from '../passes/ir/runContext.js';
import { runDriver } from '../passes/ir/runDriver.js';

/** @import {DeclarationPlans} from './declarationWalk.js' */
/** @import {RunPlan} from './hostPlan.js' */

/**
 * What the host resolved for one stylesheet: its run plan, its declaration plans
 * when the run has stages, and the resolved targets of the merge. `browsers` is
 * undefined when the merge is off.
 *
 * @typedef {object} Stylesheet
 * @property {RunPlan} plan
 * @property {DeclarationPlans | undefined} declarationPlans undefined when the run has no stages
 * @property {readonly string[] | undefined} browsers the resolved browser targets of the merge
 */

/** Stands for the targets of a run whose merge is off, where the driver still takes an array. */
export const noTargets = /** @type {readonly string[]} */ (Object.freeze([]));

/**
 * One stylesheet's run over the records, between the build and the end, which
 * writes. Three phases run in order: the walk down (the discard of overridden
 * at-rules after it), the merge when it is on, and the walk up. The raw cache
 * records last, on the written tree, so that no later transform changes what it
 * describes.
 *
 * @param {import('postcss').Root} root
 * @param {import('postcss').Result} result
 * @param {Stylesheet} stylesheet
 */
export function runStylesheet(root, result, stylesheet) {
  const { plan, declarationPlans, browsers } = stylesheet;
  const { merge } = plan;
  // browsers is set whenever the merge is on.
  const mergeBrowsers = /** @type {readonly string[]} */ (browsers);
  const support = merge ? merge.runner.support(mergeBrowsers) : undefined;
  const context = createRunContext(plan.consistencyChecks, support?.features);
  const state = runDriver.build(root, context);
  const round =
    merge && support ? merge.runner.round(support, context) : undefined;
  // The walk folds the rules' summaries when the merge is on, even with no stage.
  if (declarationPlans !== undefined || merge) {
    const overridable = walkDown(
      state.records,
      context,
      declarationPlans,
      round,
      browsers
    );
    if (
      declarationPlans !== undefined &&
      plan.discardOverridden !== undefined
    ) {
      discardOverriddenAtRules(
        state.records,
        context.declarations,
        overridable
      );
    }
    round?.finishColumns(state.records);
  }
  if (merge) {
    merge.runner.merge(state.records, mergeBrowsers, context, {
      rules: /** @type {boolean | undefined} */ (merge.options.rules),
    });
  }
  walkUp(state, plan, browsers, round);
  runDriver.end(state, {
    browsers: browsers ?? noTargets,
    folded: merge !== undefined,
    result,
  });
  if (plan.rawCache !== undefined) rawCache(result);
}
