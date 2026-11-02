import { consistencyChecksEnabled } from '../../../ir/consistencyChecks.js';
import { BlockRecord } from './blockRecord.js';
import { RuleRecord } from './ruleRecord.js';
import { DeclarationRecord } from '../../../ir/declarationRecord.js';

/** @import {ChildNode, Container, Rule} from 'postcss' */
/** @import {BlockRecords} from './blockRecords.js' */
/** @import {BlockRecord as Block} from './blockRecord.js' */
/** @import MergeState from './mergeState.js' */

/** @typedef {Block | RuleRecord} ContainerRecord a block, or a rule that nests */

const OUT_OF_STEP = 'block record out of step with the tree';

/**
 * Whether the live children of a container differ from the nodes it holds.
 * Compares in order and stops at the first difference, without building the
 * list of live children.
 *
 * @param {BlockRecords} records
 * @param {ContainerRecord} block
 * @return {boolean}
 */
function differs(records, block) {
  const nodes = /** @type {ChildNode[]} */ (block.node.nodes);
  if (records.liveCount(block.index) !== nodes.length) return true;
  let at = 0;
  for (
    let entry = records.links.firstChild(block.index);
    entry !== -1;
    entry = records.links.nextSibling(entry)
  ) {
    if (nodes[at++] !== records.nodeOf(entry)) return true;
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
 * Throws when the record of a rule is not linked in the container that holds
 * it, or does not nest exactly when the tree's rule holds rules or at-rules.
 *
 * @param {MergeState} mergeState
 * @param {ContainerRecord} block the container whose chain holds the rule
 * @param {RuleRecord} record
 * @return {void}
 */
function checkRuleRecord(mergeState, block, record) {
  const rule = record.node;
  record.assertFresh();
  if (mergeState.records.links.parentOf(record.index) !== block.index) {
    throw new Error(OUT_OF_STEP);
  }
  const nests = record.context !== -1;
  if (nests !== rule.nodes.some(isRuleOrAtRule)) {
    throw new Error(OUT_OF_STEP);
  }
  if (nests) {
    checkBlockRecord(mergeState, record);
  } else {
    for (const child of record.children) {
      const node = child instanceof DeclarationRecord ? child.node : child;
      if (node.parent !== rule) throw new Error(OUT_OF_STEP);
    }
  }
}

/**
 * Throws when the live children of a container are not the nodes it holds, and
 * checks the rule records and nested blocks its chain links.
 *
 * @param {MergeState} mergeState
 * @param {ContainerRecord} block
 * @return {void}
 */
function checkBlockRecord(mergeState, block) {
  const { records } = mergeState;
  if (differs(records, block)) throw new Error(OUT_OF_STEP);
  for (
    let entry = records.links.firstChild(block.index);
    entry !== -1;
    entry = records.links.nextSibling(entry)
  ) {
    const item = records.entry(entry);
    if (item instanceof RuleRecord) {
      checkRuleRecord(mergeState, block, item);
    } else if (item instanceof BlockRecord) {
      checkBlockRecord(mergeState, item);
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
 * Gives each container in the live tree whose children differ from its node
 * the children the records hold, and each plain rule that an edit changed the
 * children of. A container that already matches keeps its child list, and so
 * does a plain rule that no edit touched. Dropped and departed records are not
 * in the tree, so they keep theirs.
 *
 * @param {BlockRecords} records
 * @return {void}
 */
export function writeBack(records) {
  /** @type {Rebuilt[]} */
  const rebuilt = [];
  /** @param {ContainerRecord} container */
  const visit = (container) => {
    if (differs(records, container)) {
      rebuilt.push({
        container: /** @type {Container} */ (container.node),
        children: records.liveChildren(container.index),
        leading:
          container === records.root ? container.leadingWhitespace : undefined,
      });
    }
    for (
      let entry = records.links.firstChild(container.index);
      entry !== -1;
      entry = records.links.nextSibling(entry)
    ) {
      const record = records.entry(entry);
      if (record instanceof RuleRecord && record.context === -1) {
        if (record.edited) {
          rebuilt.push({
            container: /** @type {Container} */ (record.node),
            children: nodesOf(record),
            leading: undefined,
          });
        }
      } else if (
        record instanceof RuleRecord ||
        record instanceof BlockRecord
      ) {
        visit(record);
      }
    }
  };
  visit(records.root);
  replaceChildren(rebuilt);
}
