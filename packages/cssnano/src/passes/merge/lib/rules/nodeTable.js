import postcss from 'postcss';
import { RULE } from './blockRecord.js';

/** @import {ChildNode, Container, Root, Rule} from 'postcss' */
/** @import {BlockRecords} from './blockRecords.js' */
/** @import {ArenaIndex} from './blockRecord.js' */

/**
 * The PostCSS node of each entry, by the entry's arena index. The build fills
 * a slot for each entry it makes; write-back pushes a slot for each merged rule
 * it creates a node for. Nothing clears a slot.
 *
 * @typedef {(Root | ChildNode | undefined)[]} NodeTable
 */

/**
 * The node of the entry at `index`, or undefined past the end of the table and
 * for a merged rule that write-back has not reached.
 *
 * @param {NodeTable} nodes
 * @param {number} index
 * @return {Root | ChildNode | undefined}
 */
export function nodeOf(nodes, index) {
  return nodes[index];
}

/**
 * Gives each merged rule among the children of a rebuilt container its node,
 * with the template's source. Write-back fills the rest.
 *
 * @param {BlockRecords} records
 * @param {NodeTable} nodes
 * @param {number} container the index of the rebuilt container
 * @return {void}
 */
export function createChildNodes(records, nodes, container) {
  for (
    let entry = records.links.firstChild(container);
    entry !== -1;
    entry = records.links.nextSibling(entry)
  ) {
    const record = records.entry(entry);
    if (record.kind === RULE && nodeOf(nodes, entry) === undefined) {
      const template = /** @type {import('postcss').Rule} */ (
        nodeOf(nodes, record.template)
      );
      while (nodes.length <= entry) nodes.push(undefined);
      // The node has no selector yet, which PostCSS's props type does not allow.
      nodes[entry] = postcss.rule(
        /** @type {import('postcss').RuleProps} */ ({
          source: template.source,
        })
      );
    }
  }
}

/**
 * Adds the node of each rule a merge created that write-back has given one, in
 * arena order, which is the order the merges made them.
 *
 * @param {BlockRecords} records
 * @param {NodeTable} nodes
 * @param {Set<Container>} reported
 * @return {void}
 */
export function addMergedNodes(records, nodes, reported) {
  for (let index = records.builtCount; index < records.entryCount(); index++) {
    if (
      records.entry(/** @type {ArenaIndex} */ (index)).kind === RULE &&
      nodeOf(nodes, index) !== undefined
    ) {
      reported.add(/** @type {Rule} */ (nodes[index]));
    }
  }
}
