import { buildRecords } from './buildRecords.js';
import { childNodesOf, replaceChildren, writeBack } from './writeBack.js';
import { assertRecordsMatchTree } from './treeMatch.js';
import { createChildNodes, nodeOf } from './nodeTable.js';
import { AT_RULE_BLOCK, RULE } from './blockRecord.js';

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
function build(css, context) {
  const { records, nodes } = buildRecords(css, context);
  return { records, nodes, context };
}

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
function end(state, { browsers, folded, result }) {
  const { records, nodes, context } = state;
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
  writeBack(records, nodes, context.tokenLists);
  assertRecordsMatchTree(records, nodes, context.tokenLists, browsers, folded);
  // A removed container's node still holds the children it held, which the
  // records dropped; its children follow the records.
  for (const { index, type } of context.messages) {
    const { kind } = records.entry(index);
    if (type === 'removal' && (kind === RULE || kind === AT_RULE_BLOCK)) {
      replaceChildren([
        {
          container: /** @type {import('postcss').Container} */ (
            nodeOf(nodes, index)
          ),
          children: childNodesOf(records, nodes, index),
          leading: null,
        },
      ]);
    }
  }
  for (const { index, type, plugin, text } of context.messages) {
    const node = nodeOf(nodes, index);
    if (text === undefined) {
      result?.messages.push({ type, plugin, node });
    } else {
      result?.warn(text, { node, plugin });
    }
  }
}

/**
 * The build and the end of a run, as the host calls them around the transforms.
 * An object, so a test can count the calls.
 */
export const runDriver = { build, end };
