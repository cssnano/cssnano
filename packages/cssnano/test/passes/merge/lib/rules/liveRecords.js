import { childEntriesOf } from '../../../../../src/passes/merge/lib/rules/blockChildren.js';
import {
  BlockRecord,
  NodeEntry,
} from '../../../../../src/passes/merge/lib/rules/blockRecord.js';
import { RuleRecord } from '../../../../../src/passes/merge/lib/rules/ruleRecord.js';
import { buildRecords } from '../../../../../src/passes/merge/lib/rules/treeEdits.js';
import { declarationKeys } from '../../../../../src/passes/merge/lib/rules/declarationCache.js';
import { TextTable } from '../../../../../src/values/textTable.js';

/** @import {ChildNode, Container, Rule} from 'postcss' */
/** @import {BlockRecords} from '../../../../../src/passes/merge/lib/rules/blockRecords.js' */
/** @import {ArenaIndex} from '../../../../../src/passes/merge/lib/rules/blockRecord.js' */
/** @import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js' */

/**
 * The live entry of `block` standing for `node`: the record of a rule, or the
 * block record of an at-rule. Searches the live tree, so a rule that left the
 * stylesheet is not found.
 *
 * @param {BlockRecords} records
 * @param {BlockRecord | RuleRecord} block the block, or the rule that nests
 * @param {object} node
 * @return {RuleRecord | BlockRecord | undefined}
 */
function liveEntryOf(records, block, node) {
  for (const entry of childEntriesOf(records, block.index)) {
    if (entry instanceof RuleRecord) {
      if (entry.node === node) return entry;
      if (entry.context !== -1) {
        const found = liveEntryOf(records, entry, node);
        if (found) return found;
      }
    } else if (entry instanceof BlockRecord) {
      if (entry.node === node) return entry;
      const found = liveEntryOf(records, entry, node);
      if (found) return found;
    } else if (entry instanceof NodeEntry && entry.node === node) {
      return entry;
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
  const found = liveEntryOf(records, records.root, rule);
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
  const found = liveEntryOf(records, records.root, node);
  if (found === undefined) throw new Error('no live entry for the node');
  return found;
}

/**
 * The container record of a container that is live in `records`: the
 * stylesheet, an at-rule, or a rule that holds rules or at-rules.
 *
 * @param {BlockRecords} records
 * @param {Container} node
 * @return {BlockRecord | RuleRecord}
 * @throws {Error} when no live container record stands for the container
 */
export function blockRecordOf(records, node) {
  if (node === records.root.node) return records.root;
  const found = liveEntryOf(records, records.root, node);
  if (found instanceof RuleRecord && found.context !== -1) return found;
  if (found instanceof BlockRecord) return found;
  throw new Error('no live block record for the container');
}

/**
 * The arena indices of the declarations of `rule` at `positions`, counted
 * along its chain as it stands now. A test names the declarations it claims
 * this way, in chain order.
 *
 * @param {BlockRecords} records
 * @param {RuleRecord} rule
 * @param {number[]} positions
 * @return {Set<import('../../../../../src/passes/merge/lib/rules/blockRecord.js').ArenaIndex>}
 */
export function claimAt(records, rule, positions) {
  const declarations = rule.declarationsOf(records);
  return new Set(positions.map((position) => declarations[position].index));
}

/**
 * The records of `root` built the way the driver builds them, from the run
 * state of a test's merge state. The text table holds the tokens a test stored,
 * and is empty by default.
 *
 * @param {import('postcss').Root} root
 * @param {MergeState} state
 * @param {TextTable} [textTable]
 * @return {BlockRecords}
 */
export function buildTestRecords(root, state, textTable = new TextTable()) {
  return buildRecords(root, {
    textTable,
    declarations: state.declarationIds,
    properties: state.properties,
  });
}

/**
 * A view of `records` whose links read a corrupted value for one container, so
 * a check can see a chain that the arena never builds. Each method of the view
 * runs on the real arena or links, which hold private fields.
 *
 * @param {BlockRecords} records
 * @param {number} container the index of the container to corrupt
 * @param {Record<string, (real: object, index: number) => number>} corrupt a
 *   reader of the corrupted value, by the link read it replaces
 * @return {BlockRecords}
 */
export function withCorruptedLinks(records, container, corrupt) {
  const links = new Proxy(records.links, {
    get(target, key) {
      const read = Reflect.get(target, key, target);
      if (typeof read !== 'function') return read;
      return (/** @type {number} */ index) =>
        index === container && key in corrupt
          ? corrupt[/** @type {string} */ (key)](target, index)
          : read.call(target, index);
    },
  });
  return new Proxy(records, {
    get(target, key) {
      if (key === 'links') return links;
      const value = Reflect.get(target, key, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

/**
 * The ids of the declarations of the rule at `index`, in chain order.
 *
 * @param {BlockRecords} records
 * @param {number} index an index that `recordRule` gave
 * @return {number[]}
 */
export function declarationIds(records, index) {
  return declarationKeys(records, /** @type {ArenaIndex} */ (index)).kept.map(
    (entry) => records.entry(entry).id
  );
}
