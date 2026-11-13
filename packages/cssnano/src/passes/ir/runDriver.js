import { buildRecords } from './buildRecords.js';
import { guardWindow } from './windowGuard.js';
import { writeBack } from './writeBack.js';
import { assertRecordsMatchTree } from './treeMatch.js';
import { createChildNodes, nodeOf } from './nodeTable.js';

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
function build(css, context) {
  const { records, nodes } = buildRecords(css, context);
  const release = context.consistencyChecks
    ? guardWindow(context.textTable)
    : undefined;
  return { records, nodes, context, release };
}

/**
 * Ends a run: releases the window guard, writes the records back, checks them
 * against the tree, and pushes the messages in the order they were appended.
 *
 * @param {RunState} state
 * @param {{browsers: readonly string[], folded: boolean, result?: Result}} end
 *   the browser targets, whether the run folded the summaries, and the result
 *   whose messages the run pushes to; a run whose transforms append none has no result to give
 * @return {void}
 */
function end(state, { browsers, folded, result }) {
  const { records, nodes, context } = state;
  state.release?.();
  // A message's entry may be one the transforms made, which has no node yet.
  for (const { index } of context.messages) {
    if (nodeOf(nodes, index) === undefined) {
      createChildNodes(
        records,
        nodes,
        records.links.parentOf(index),
        context.tokenLists
      );
    }
  }
  writeBack(records, nodes, context.tokenLists, context.textTable);
  assertRecordsMatchTree(records, nodes, context.tokenLists, browsers, folded);
  for (const { index, type, plugin } of context.messages) {
    result?.messages.push({ type, plugin, node: nodeOf(nodes, index) });
  }
}

/**
 * The build and the end of a run, as the host calls them around the transforms.
 * An object, so a test can count the calls.
 */
export const runDriver = { build, end };
