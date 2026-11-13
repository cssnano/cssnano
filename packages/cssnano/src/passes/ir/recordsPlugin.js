import { createRunContext } from './runContext.js';
import { runDriver } from './runDriver.js';
import { keepSelectorComments } from './keepSelectorComments.js';

/** @import {Result, Root} from 'postcss' */
/** @import {BlockRecords} from './blockRecords.js' */
/** @import {RunContext} from './runContext.js' */

/**
 * A transform over the records of one run, with the browser targets and the
 * run's context.
 *
 * @typedef {(records: BlockRecords, browsers: readonly string[], context: RunContext) => void} RecordsTransform
 */

/**
 * The body of a standalone PostCSS plugin over the records: builds the
 * stylesheet, runs the transforms in order, and ends the run with the result.
 * There is no host walk, so each rule's comments that PostCSS keeps only in its
 * raw selector move into the selector first, where the build reads them.
 *
 * @param {Root} css
 * @param {Result} result the result whose messages the run pushes to
 * @param {readonly RecordsTransform[]} transforms
 * @param {readonly string[]} [browsers] the resolved browser targets
 * @param {boolean} [consistencyChecks] whether the run checks its caches; the process default otherwise
 * @return {void}
 */
export function runRecordsPlugin(
  css,
  result,
  transforms,
  browsers = [],
  consistencyChecks = undefined
) {
  css.walkRules(keepSelectorComments);
  const context = createRunContext(undefined, consistencyChecks);
  const state = runDriver.build(css, context);
  for (const transform of transforms) {
    transform(state.records, browsers, context);
  }
  runDriver.end(state, { browsers, folded: true, result });
}
