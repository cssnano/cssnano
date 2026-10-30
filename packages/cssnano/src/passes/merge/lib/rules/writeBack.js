import { consistencyChecksEnabled } from '../../../ir/consistencyChecks.js';
import { BlockRecord, Slot } from './blockRecords.js';

/** @import {ChildNode, Container, Rule} from 'postcss' */
/** @import {BlockRecord as Block} from './blockRecords.js' */
/** @import MergeState from './mergeState.js' */

const OUT_OF_STEP = 'block record out of step with the tree';

/**
 * Whether the live children of a block differ from the nodes its container
 * holds. Compares in order and stops at the first difference, without building
 * the list of live children.
 *
 * @param {Block} block
 * @return {boolean}
 */
function differs(block) {
  const nodes = /** @type {ChildNode[]} */ (block.node.nodes);
  if (block.liveCount() !== nodes.length) return true;
  let at = 0;
  for (const entry of block.children) {
    if (entry instanceof Slot) {
      for (const rule of entry.rules) {
        if (nodes[at++] !== rule) return true;
      }
    } else if (entry instanceof BlockRecord) {
      if (entry.dropped) continue;
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
 * @param {Rule} rule
 * @return {void}
 */
function checkRuleRecord(mergeState, block, slot, rule) {
  const meta = mergeState.meta(rule);
  if (meta.slot !== slot) throw new Error(OUT_OF_STEP);
  if ((meta.block !== null) !== rule.nodes.some(isRuleOrAtRule)) {
    throw new Error(OUT_OF_STEP);
  }
  if (meta.block) {
    if (
      meta.block.parent !== block ||
      meta.block.node !== rule ||
      meta.block.position !== slot.position
    ) {
      throw new Error(OUT_OF_STEP);
    }
    checkBlockRecord(mergeState, meta.block);
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
  if (differs(block)) throw new Error(OUT_OF_STEP);
  for (const entry of block.children) {
    if (entry instanceof Slot) {
      for (const rule of entry.rules) {
        checkRuleRecord(mergeState, block, entry, rule);
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
 * @property {ChildNode | undefined} head the first child the root held before,
 * or undefined for any other container
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
  for (const { container, children, head } of rebuilt) {
    // A rule kept from the source still points at its former container.
    for (const node of children) node.parent = undefined;
    container.append(children);
    // Removing the first child of a root hands its whitespace to the next.
    if (
      container.type === 'root' &&
      head &&
      children.length &&
      children[0] !== head
    ) {
      children[0].raws.before = head.raws.before;
    }
  }
}

/**
 * Gives each block whose live children differ from its container the children
 * the records hold. A block that already matches keeps its child list.
 *
 * @param {Iterable<Block>} blocks
 * @param {ChildNode | undefined} rootHead the first child of the stylesheet
 * before the sweep, handed on if the stylesheet is rebuilt
 * @return {void}
 */
export function writeBack(blocks, rootHead) {
  /** @type {Rebuilt[]} */
  const rebuilt = [];
  for (const block of blocks) {
    if (!differs(block)) continue;
    rebuilt.push({
      container: /** @type {Container} */ (block.node),
      children: block.liveChildren(),
      head: block.parent === null ? rootHead : undefined,
    });
  }
  replaceChildren(rebuilt);
}
