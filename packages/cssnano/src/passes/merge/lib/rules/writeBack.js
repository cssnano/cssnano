import { consistencyChecksEnabled } from '../../../ir/consistencyChecks.js';
import { Slot } from './blockRecords.js';
import { BlockRecord } from './blockRecord.js';
import { DeclarationRecord } from '../../../ir/declarationRecord.js';

/** @import {ChildNode, Container, Rule} from 'postcss' */
/** @import {BlockRecords} from './blockRecords.js' */
/** @import {BlockRecord as Block} from './blockRecord.js' */
/** @import MergeState from './mergeState.js' */
/** @import {RuleRecord} from './ruleRecord.js' */

const OUT_OF_STEP = 'block record out of step with the tree';

/**
 * Whether the live children of a block differ from the nodes its container
 * holds. Compares in order and stops at the first difference, without building
 * the list of live children.
 *
 * @param {BlockRecords} records
 * @param {Block} block
 * @return {boolean}
 */
function differs(records, block) {
  const nodes = /** @type {ChildNode[]} */ (block.node.nodes);
  if (records.liveCount(block.index) !== nodes.length) return true;
  let at = 0;
  for (const entry of block.children) {
    if (entry instanceof Slot) {
      for (const index of entry.rules) {
        const record = /** @type {RuleRecord} */ (records.rule(index));
        if (nodes[at++] !== record.node) return true;
      }
    } else if (entry instanceof BlockRecord) {
      if (entry.dropped) continue;
      if (nodes[at++] !== entry.node) return true;
    } else if (entry instanceof DeclarationRecord) {
      if (nodes[at++] !== entry.node) return true;
    } else if (nodes[at++] !== entry) {
      return true;
    }
  }
  return false;
}

/**
 * @param {ChildNode} node
 * @return {boolean} whether the node holds rules or at-rules
 */
function isRuleOrAtRule(node) {
  return node.type === 'rule' || node.type === 'atrule';
}

/**
 * Throws when the record of a rule does not name its slot, or does not hold
 * the block of the rule's children that the tree has.
 *
 * @param {MergeState} mergeState
 * @param {Block} block the block holding the slot
 * @param {Slot} slot
 * @param {RuleRecord} record
 * @return {void}
 */
function checkRuleRecord(mergeState, block, slot, record) {
  const rule = record.node;
  record.assertFresh();
  if (mergeState.records.slotOf(record) !== slot) {
    throw new Error(OUT_OF_STEP);
  }
  if ((record.block !== -1) !== rule.nodes.some(isRuleOrAtRule)) {
    throw new Error(OUT_OF_STEP);
  }
  if (record.block !== -1) {
    const nested = /** @type {BlockRecord} */ (
      mergeState.records.block(record.block)
    );
    if (
      nested.parent !== block.index ||
      nested.node !== rule ||
      nested.position !== slot.position
    ) {
      throw new Error(OUT_OF_STEP);
    }
    checkBlockRecord(mergeState, nested);
  } else {
    for (const child of record.children) {
      const node = child instanceof DeclarationRecord ? child.node : child;
      if (node.parent !== rule) throw new Error(OUT_OF_STEP);
    }
  }
}

/**
 * Throws when the live children of a block are not the nodes its container
 * holds, and checks the rule records of its slots.
 *
 * @param {MergeState} mergeState
 * @param {Block} block
 * @return {void}
 */
function checkBlockRecord(mergeState, block) {
  if (differs(mergeState.records, block)) throw new Error(OUT_OF_STEP);
  for (const entry of block.children) {
    if (entry instanceof Slot) {
      for (const index of entry.rules) {
        const record = /** @type {RuleRecord} */ (
          mergeState.records.rule(index)
        );
        checkRuleRecord(mergeState, block, entry, record);
      }
    } else if (entry instanceof BlockRecord && !entry.dropped) {
      checkBlockRecord(mergeState, entry);
    }
  }
}

/**
 * Under consistency checks, throws when the records and the tree disagree:
 * each block must hold the nodes its container holds, in order, and each rule
 * must stand in the slot its record names. Writes nothing.
 *
 * @param {MergeState} mergeState
 * @return {void}
 */
export function assertRecordsMatchTree(mergeState) {
  if (!consistencyChecksEnabled()) return;
  checkBlockRecord(mergeState, mergeState.records.root);
}

/**
 * @typedef {object} Rebuilt
 * @property {Container} container
 * @property {ChildNode[]} children the children the container takes
 * @property {string | undefined} leading the whitespace the first child of a
 * root takes, or undefined for any other container
 */

/**
 * Gives each container its children, after every container has been emptied,
 * so a child that moves between two of them keeps the parent it is given.
 *
 * @param {Rebuilt[]} rebuilt
 * @return {void}
 */
export function replaceChildren(rebuilt) {
  for (const { container } of rebuilt) {
    container.removeAll();
  }
  for (const { container, children, leading } of rebuilt) {
    // A rule kept from the source still points at its former container.
    for (const node of children) node.parent = undefined;
    container.append(children);
    // Appending rewrites the whitespace of the nodes it places, so the first
    // child of a root takes the leading whitespace after the append.
    if (leading !== undefined && children.length) {
      children[0].raws.before = leading;
    }
  }
}

/**
 * The nodes of the children a rule record holds, comments included, in order.
 *
 * @param {RuleRecord} record a rule that holds no block
 * @return {ChildNode[]}
 */
function nodesOf(record) {
  /** @type {ChildNode[]} */
  const nodes = [];
  for (const child of record.children) {
    nodes.push(child instanceof DeclarationRecord ? child.node : child);
  }
  return nodes;
}

/**
 * Gives each block whose live children differ from its container the children
 * the records hold, and each rule that an edit changed the children of. A
 * block that already matches, or was dropped, keeps its child list, and so
 * does a rule that no edit touched.
 *
 * @param {BlockRecords} records
 * @param {Iterable<Block>} blocks
 * @return {void}
 */
export function writeBack(records, blocks) {
  /** @type {Rebuilt[]} */
  const rebuilt = [];
  for (const block of blocks) {
    if (block.dropped) continue;
    if (differs(records, block)) {
      rebuilt.push({
        container: /** @type {Container} */ (block.node),
        children: records.liveChildren(block.index),
        leading: block.parent === -1 ? block.leadingWhitespace : undefined,
      });
    }
    for (const entry of block.children) {
      if (!(entry instanceof Slot)) continue;
      for (const index of entry.rules) {
        const record = /** @type {RuleRecord} */ (records.rule(index));
        if (record.edited && record.block === -1) {
          rebuilt.push({
            container: /** @type {Container} */ (record.node),
            children: nodesOf(record),
            leading: undefined,
          });
        }
      }
    }
  }
  replaceChildren(rebuilt);
}
