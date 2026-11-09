import { AT_RULE_BLOCK, RULE, STYLESHEET } from './blockRecord.js';
import { TextTable } from '../../../../values/textTable.js';
import { addMergedNodes, createChildNodes, nodeOf } from './nodeTable.js';
import { writeSelector } from './writeSelector.js';

/** @import {ChildNode, Container} from 'postcss' */
/** @import {BlockRecords} from './blockRecords.js' */
/** @import {NodeTable} from './nodeTable.js' */
/** @import {BlockRecord as Block} from './blockRecord.js' */
/** @import {RuleRecord} from './ruleRecord.js' */

const TABLE_LENGTH =
  'the node table does not have one slot per entry the build made';

/**
 * The nodes of the children the block at `index` holds now, in order.
 *
 * @param {BlockRecords} records
 * @param {NodeTable} nodes
 * @param {number} index
 * @return {ChildNode[]}
 */
export function childNodesOf(records, nodes, index) {
  /** @type {ChildNode[]} */ const children = [];
  let entry = records.links.firstChild(index);
  while (entry !== -1) {
    children.push(/** @type {ChildNode} */ (nodeOf(nodes, entry)));
    entry = records.links.nextSibling(entry);
  }
  return children;
}

/** @typedef {Block | RuleRecord} ContainerRecord a block, or a rule, whose children form its chain */

/**
 * Whether the live children of a container differ from its nodes. Compares in
 * order and stops at the first difference, without a list of live children.
 *
 * @param {BlockRecords} records
 * @param {NodeTable} nodes
 * @param {ContainerRecord} block
 * @return {boolean}
 */
export function differs(records, nodes, block) {
  const children = /** @type {ChildNode[]} */ (
    /** @type {Container} */ (nodeOf(nodes, block.index)).nodes
  );
  if (records.links.childCount(block.index) !== children.length) return true;
  let at = 0;
  for (
    let entry = records.links.firstChild(block.index);
    entry !== -1;
    entry = records.links.nextSibling(entry)
  ) {
    if (children[at++] !== nodeOf(nodes, entry)) return true;
  }
  return false;
}

/**
 * @typedef {object} Rebuilt
 * @property {Container} container
 * @property {ChildNode[]} children the children the container takes
 * @property {string | null} leading the whitespace the first child of a
 * root takes, or null for any other container
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
    if (leading !== null && children.length) {
      children[0].raws.before = leading;
    }
  }
}

/**
 * Assigns the whitespace before each child of a rebuilt container from the
 * records, where a merge may have changed it. Runs after the append, which
 * rewrites the whitespace of the nodes it places. A record whose value is null
 * leaves its node's whitespace as it is.
 *
 * @param {BlockRecords} records
 * @param {NodeTable} nodes
 * @param {number} container the index of the rebuilt container's record
 * @return {void}
 */
function writeBefore(records, nodes, container) {
  for (
    let entry = records.links.firstChild(container);
    entry !== -1;
    entry = records.links.nextSibling(entry)
  ) {
    const { before } = records.entry(entry);
    if (before !== null) {
      /** @type {ChildNode} */ (nodeOf(nodes, entry)).raws.before = before;
    }
  }
}

/**
 * Walks the live tree from the root. Each rule it reaches gets its selector
 * written, and each container whose children differ from its node gets the
 * children the records hold, as does each plain rule that an edit changed the
 * children of. A container that already matches keeps its child list, and so
 * does a plain rule that no edit touched. A record the root does not reach,
 * dropped, keeps its node as it is, and a merged rule the root
 * does not reach gets none.
 *
 * @param {BlockRecords} records
 * @param {NodeTable} nodes the node of each entry, from the build; write-back adds the merged rules' nodes
 * @param {TextTable} [textTable] the table the selectors are written through
 * @param {Set<Container> | null} [reported] receives the node of each rule a merge created that the tree reaches
 * @return {void}
 */
export function writeBack(
  records,
  nodes,
  textTable = new TextTable(),
  reported = null
) {
  if (records.consistencyChecks && nodes.length !== records.builtCount) {
    throw new Error(TABLE_LENGTH);
  }
  /** @type {(Rebuilt & {index: number})[]} */
  const rebuilt = [];
  /** @param {ContainerRecord} container */
  const visit = (container) => {
    if (differs(records, nodes, container)) {
      createChildNodes(records, nodes, container.index);
      rebuilt.push({
        container: /** @type {Container} */ (nodeOf(nodes, container.index)),
        index: container.index,
        children: childNodesOf(records, nodes, container.index),
        leading: container === records.root ? records.leadingWhitespace : null,
      });
    }
    for (
      let entry = records.links.firstChild(container.index);
      entry !== -1;
      entry = records.links.nextSibling(entry)
    ) {
      const record = records.entry(entry);
      if (record.kind === RULE) {
        writeSelector(record, records, nodes, textTable);
        if (record.context !== -1) {
          visit(record);
        } else if (records.links.isEdited(record.index)) {
          rebuilt.push({
            container: /** @type {Container} */ (nodeOf(nodes, record.index)),
            index: record.index,
            children: childNodesOf(records, nodes, record.index),
            leading: null,
          });
        }
      } else if (record.kind === STYLESHEET || record.kind === AT_RULE_BLOCK) {
        visit(record);
      }
    }
  };
  visit(records.root);
  if (reported) addMergedNodes(records, nodes, reported);
  replaceChildren(rebuilt);
  for (const { index } of rebuilt) writeBefore(records, nodes, index);
  // The first child of the stylesheet takes the leading whitespace last.
  const root = /** @type {Container} */ (nodeOf(nodes, records.root.index));
  const first = root.first;
  const { leadingWhitespace } = records;
  if (first && leadingWhitespace !== null) {
    first.raws.before = leadingWhitespace;
  }
}
