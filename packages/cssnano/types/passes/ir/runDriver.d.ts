import type { Result, Root } from 'postcss';
import type { BlockRecords } from './blockRecords.js';
import type { NodeTable } from './nodeTable.js';
import type { RunContext } from './runContext.js';
export type RunState = {
    records: BlockRecords;
    nodes: NodeTable;
    context: RunContext;
};
/** @import {Result, Root} from 'postcss' */
/** @import {BlockRecords} from './blockRecords.js' */
/** @import {NodeTable} from './nodeTable.js' */
/** @import {RunContext} from './runContext.js' */
/**
 * A run between its build and its end: the records, their nodes, and the run's
 * context.
 *
 * @typedef {{records: BlockRecords, nodes: NodeTable, context: RunContext}} RunState
 */
/**
 * Builds the records of a stylesheet from its tree.
 *
 * @param {Root} css
 * @param {RunContext} context
 * @return {RunState}
 */
declare function build(css: Root, context: RunContext): RunState;
/**
 * Ends a run: writes the records back, checks them against the tree, and gives
 * the result its messages in the order they were appended: warnings through
 * `warn`, the rest pushed to `messages`.
 *
 * @param {RunState} state
 * @param {{browsers: readonly string[], folded: boolean, result?: Result}} end
 *   the browser targets, whether the run folded the summaries, and the result
 *   whose messages the run pushes to; a run whose transforms append none has no result to give
 * @return {void}
 */
declare function end(state: RunState, { browsers, folded, result }: {
    browsers: readonly string[];
    folded: boolean;
    result?: Result;
}): void;
/**
 * The build and the end of a run, as the host calls them around the transforms.
 * An object, so a test can count the calls.
 */
export declare const runDriver: {
    build: typeof build;
    end: typeof end;
};
export {};
//# sourceMappingURL=runDriver.d.ts.map