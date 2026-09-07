import resolveBorderGrid from './borderMatrix.js';
import { cleanup, explode, mergeBorderSpacing } from './borderLifecycle.js';
import {
  containsUnmergeableBorderDecls,
  hasBorderResetContext,
} from './borderValidation.js';
import {
  mergeComponentsToBorder,
  mergeComponentsToBorderAndSides,
  mergeSideComponentsToComponent,
  mergeSideComponentsToSide,
  mergeSidesToBorder,
  mergeSidesToComponents,
  rebindComponentCustomProp,
  rebindSideCustomProp,
} from './borderMerges.js';
import {
  hoistSubsumedComponents,
  mergeRedundantSweep,
  optimizeSides,
} from './borderFinalizers.js';

/**
 * @param {import('postcss').Rule} rule
 * @return {void}
 */
function merge(rule) {
  mergeBorderSpacing(rule);

  if (containsUnmergeableBorderDecls(rule)) {
    resolveBorderGrid(rule);
    return;
  }

  const canCreateBorder = hasBorderResetContext(rule);

  mergeSideComponentsToSide(rule);
  mergeSideComponentsToComponent(rule);
  mergeSidesToComponents(rule);
  mergeComponentsToBorder(rule, canCreateBorder);
  mergeComponentsToBorderAndSides(rule, canCreateBorder);
  mergeSidesToBorder(rule, canCreateBorder);
  rebindSideCustomProp(rule);
  rebindComponentCustomProp(rule);
  optimizeSides(rule);
  mergeRedundantSweep(rule);
  hoistSubsumedComponents(rule);

  cleanup(rule);
}

export default { explode, merge };
