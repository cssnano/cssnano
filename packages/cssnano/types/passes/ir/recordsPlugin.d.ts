import type { Result, Root } from 'postcss';
import type { BlockRecords } from './blockRecords.js';
import type { RunContext } from './runContext.js';
export type RecordsTransform = (records: BlockRecords, browsers: readonly string[], context: RunContext) => void;
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
 * There is no host walk; the build reads each selector as written.
 *
 * @param {Root} css
 * @param {Result} result the result whose messages the run pushes to
 * @param {readonly RecordsTransform[]} transforms
 * @param {readonly string[]} [browsers] the resolved browser targets
 * @param {boolean} [consistencyChecks] whether the run checks its caches; the process default otherwise
 * @return {void}
 */
export declare function runRecordsPlugin(css: Root, result: Result, transforms: readonly RecordsTransform[], browsers?: readonly string[], consistencyChecks?: boolean): void;
//# sourceMappingURL=recordsPlugin.d.ts.map