import { hostPlugin } from '../../src/pipeline/host.js';
import { hostPlan } from '../../src/pipeline/hostPlan.js';
import { transformRunner } from '../../src/passes/merge/index.js';

/** The three merge transforms, in the order the preset runs them. */
export const MERGE_TRANSFORMS = Object.freeze([
  'mergeLonghand',
  'discardDuplicates',
  'mergeRules',
]);

/**
 * A PostCSS plugin creator whose run has just the named merge transforms on: the
 * host walk and the driver run, with no stages, so a test pins those transforms
 * alone.
 *
 * @param {('mergeLonghand' | 'discardDuplicates' | 'mergeRules')[]} names
 * @param {{consistencyChecks?: boolean}} [runOptions] whether the run checks its caches
 * @return {import('postcss').PluginCreator<object>}
 */
export function onlyTransform(names, runOptions = {}) {
  /** @type {import('postcss').PluginCreator<object>} */
  const creator = (options = {}) =>
    hostPlugin(
      hostPlan({
        merge: { options, runner: transformRunner(...names) },
        consistencyChecks: runOptions.consistencyChecks,
      })
    );
  creator.postcss = true;
  return creator;
}
