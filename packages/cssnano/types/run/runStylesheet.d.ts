import type { DeclarationPlans } from './declarationWalk.js';
import type { RunPlan } from './hostPlan.js';
export type Stylesheet = {
    plan: RunPlan;
    /**
     * undefined when the run has no stages
     */
    declarationPlans: DeclarationPlans | undefined;
    /**
     * the resolved browser targets of the merge
     */
    browsers: readonly string[] | undefined;
};
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
export declare const noTargets: readonly string[];
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
export declare function runStylesheet(root: import('postcss').Root, result: import('postcss').Result, stylesheet: Stylesheet): void;
//# sourceMappingURL=runStylesheet.d.ts.map