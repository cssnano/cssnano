import * as lifecycle from './borderLifecycle.js';
import * as validation from './borderValidation.js';
import * as merges from './borderMerges.js';
import * as finalizers from './borderFinalizers.js';

/** @param {import('postcss').Rule} rule */
function merge(rule) {
  lifecycle.mergeBorderSpacing(rule);
  if (validation.containsUnmergeableBorderDecls(rule)) return;

  const canCreateBorder = validation.hasBorderResetContext(rule);
  merges.mergeSideComponentsToSide(rule);
  merges.mergeSideComponentsToComponent(rule);
  merges.mergeSidesToComponents(rule);
  merges.mergeComponentsToBorder(rule, canCreateBorder);
  merges.mergeComponentsToBorderAndSides(rule, canCreateBorder);
  merges.mergeSidesToBorder(rule, canCreateBorder);
  merges.rebindSideCustomProp(rule);
  merges.rebindComponentCustomProp(rule);
  finalizers.optimizeSides(rule);
  finalizers.mergeRedundantSweep(rule);
  finalizers.hoistSubsumedComponents(rule);
  lifecycle.cleanup(rule);
}

export default { explode: lifecycle.explode, merge };
