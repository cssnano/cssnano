import { BlockRecord } from '../../../../../src/passes/merge/lib/rules/blockRecords.js';
import { RuleRecord } from '../../../../../src/passes/merge/lib/rules/ruleRecord.js';

/** @import {ChildNode, Container, Rule} from 'postcss' */
/** @import {BlockRecords} from '../../../../../src/passes/merge/lib/rules/blockRecords.js' */

/**
 * The live entry of `block` standing for `node`: the record of a rule, or the
 * block record of an at-rule. Searches the live tree, so a rule that left the
 * stylesheet is not found.
 *
 * @param {BlockRecord} block
 * @param {object} node
 * @return {RuleRecord | BlockRecord | undefined}
 */
function liveEntryOf(block, node) {
  for (const entry of block.liveEntries()) {
    if (entry instanceof RuleRecord) {
      if (entry.node === node) return entry;
      if (entry.block) {
        const found = liveEntryOf(entry.block, node);
        if (found) return found;
      }
    } else if (entry instanceof BlockRecord) {
      if (entry.node === node) return entry;
      const found = liveEntryOf(entry, node);
      if (found) return found;
    }
  }
  return undefined;
}

/**
 * The record of a rule that is live in `records`.
 *
 * @param {BlockRecords} records
 * @param {Rule} rule
 * @return {RuleRecord}
 * @throws {Error} when no live entry holds the rule
 */
export function ruleRecordOf(records, rule) {
  const found = liveEntryOf(records.root, rule);
  if (found instanceof RuleRecord) return found;
  throw new Error('no live rule record for the rule');
}

/**
 * The live entry that stands for a child of the stylesheet: the record of a
 * rule, the block record of an at-rule with a block, or the node itself.
 *
 * @param {BlockRecords} records
 * @param {ChildNode} node
 * @return {RuleRecord | BlockRecord | ChildNode}
 */
export function entryOf(records, node) {
  if (node.type === 'rule') return ruleRecordOf(records, node);
  if (node.type === 'atrule' && node.nodes) return blockRecordOf(records, node);
  return node;
}

/**
 * The block record of a container that is live in `records`: the stylesheet, an
 * at-rule, or a rule that holds rules or at-rules.
 *
 * @param {BlockRecords} records
 * @param {Container} node
 * @return {BlockRecord}
 * @throws {Error} when no live block record stands for the container
 */
export function blockRecordOf(records, node) {
  if (node === records.root.node) return records.root;
  const found = liveEntryOf(records.root, node);
  if (found instanceof RuleRecord && found.block) return found.block;
  if (found instanceof BlockRecord) return found;
  throw new Error('no live block record for the container');
}
