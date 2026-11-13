import type { Result, Root } from 'postcss';
import type { BlockRecords } from './blockRecords.js';
import type { NodeTable } from './nodeTable.js';
import type { RunContext } from './runContext.js';
export type RunState = {
    records: BlockRecords;
    nodes: NodeTable;
    context: RunContext;
    release: (() => void) | undefined;
};
/** @import {Result, Root} from 'postcss' */
/** @import {BlockRecords} from './blockRecords.js' */
/** @import {NodeTable} from './nodeTable.js' */
/** @import {RunContext} from './runContext.js' */
/**
 * A run between its build and its end: the records and nodes of the build, and
 * the release of the window guard that the build set under checks.
 *
 * @typedef {{records: BlockRecords, nodes: NodeTable, context: RunContext, release: (() => void) | undefined}} RunState
 */
/**
 * Builds the records of a stylesheet, and guards the text table for the window
 * that the transforms run in, under consistency checks.
 *
 * @param {Root} css
 * @param {RunContext} context
 * @return {RunState}
 */
declare function build(css: Root, context: RunContext): RunState;
/**
 * Ends a run: releases the window guard, writes the records back, checks them
 * against the tree, and pushes the messages in the order they were appended.
 *
 * @param {RunState} state
 * @param {{browsers: readonly string[], folded: boolean, result?: Result}} end
 *   the browser targets, whether the run folded the summaries, and the result
 *   whose messages the run pushes to; a run whose transforms append none has no result to give
 * @return {NodeTable} the node of each entry, which the run keeps after its end
 */
declare function end(state: RunState, { browsers, folded, result }: {
    browsers: readonly string[];
    folded: boolean;
    result?: Result;
}): NodeTable;
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