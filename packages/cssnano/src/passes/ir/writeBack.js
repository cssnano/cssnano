import {
  AT_RULE_BLOCK,
  AT_RULE_STATEMENT,
  DECLARATION,
  RULE,
  STYLESHEET,
} from './blockRecord.js';
import { TextTable } from '../../values/textTable.js';
import { tokensText } from '../../values/tokensText.js';
import { createChildNodes, nodeOf } from './nodeTable.js';
import { writeSelector } from './writeSelector.js';
import { assertTemplatesHaveNodes } from './recordsCheck.js';

/** @import {AtRule, ChildNode, Container, Root, Rule} from 'postcss' */
/** @import {BlockRecords} from './blockRecords.js' */
/** @import {NodeTable} from './nodeTable.js' */
/** @import {BlockRecord as Block, NodeEntry} from './blockRecord.js' */
/** @import {RuleRecord} from './ruleRecord.js' */
/** @import {TokenListId, TokenLists} from './tokenLists.js' */
/** @import {DeclarationRecord} from './declarationRecord.js' */

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
 * Assigns the raws the records hold to the nodes of the children of a
 * container, then to those of the children of each container below it. A field
 * that is null leaves its node raw as it is.
 *
 * @param {BlockRecords} records
 * @param {NodeTable} nodes
 * @param {TokenLists} tokenLists
 * @param {number} container the index of a container record the root reaches
 * @return {void}
 */
function writeRawsOf(records, nodes, tokenLists, container) {
  for (
    let entry = records.links.firstChild(container);
    entry !== -1;
    entry = records.links.nextSibling(entry)
  ) {
    const record = records.entry(entry);
    const node = /** @type {ChildNode} */ (nodeOf(nodes, entry));
    if (record.before !== null) node.raws.before = record.before;
    if (record.kind === RULE || record.kind === AT_RULE_BLOCK) {
      writeContainerRaws(record, /** @type {Rule | AtRule} */ (node));
      if (record.kind === AT_RULE_BLOCK) {
        writeParams(record, /** @type {AtRule} */ (node), tokenLists);
        if (record.afterName !== null) {
          /** @type {AtRule} */ (node).raws.afterName = record.afterName;
        }
      }
      writeRawsOf(records, nodes, tokenLists, entry);
    } else if (record.kind === AT_RULE_STATEMENT) {
      writeStatementRaws(record, /** @type {AtRule} */ (node));
      writeParams(record, /** @type {AtRule} */ (node), tokenLists);
    }
  }
}

/**
 * Assigns the raws of a rule or an at-rule block that its record holds.
 *
 * @param {RuleRecord | Block} record
 * @param {Rule | AtRule} node
 * @return {void}
 */
function writeContainerRaws(record, node) {
  if (record.between !== null) node.raws.between = record.between;
  if (record.after !== null) node.raws.after = record.after;
  if (record.semicolon !== null) node.raws.semicolon = record.semicolon;
}

/**
 * Assigns the prelude of a marked at-rule, as its list spells it, and drops the
 * raw params that spelled the prelude before. An unmarked at-rule keeps its
 * node text.
 *
 * @param {Block | NodeEntry} record
 * @param {AtRule} node
 * @param {TokenLists} tokenLists
 * @return {void}
 */
function writeParams(record, node, tokenLists) {
  if (!record.marked) return;
  node.params = tokensText(
    tokenLists.get(/** @type {TokenListId} */ (record.preludeId))
  );
  delete node.raws.params;
}

/**
 * Assigns the raws of an at-rule statement that its record holds.
 *
 * @param {NodeEntry} record
 * @param {AtRule} node
 * @return {void}
 */
function writeStatementRaws(record, node) {
  if (record.between !== null) node.raws.between = record.between;
  if (record.afterName !== null) node.raws.afterName = record.afterName;
}

/**
 * Writes a marked declaration in place: its property and the text of its value
 * list, and no raw value, since the raw spelled the text before the rewrite.
 *
 * @param {DeclarationRecord} record
 * @param {NodeTable} nodes
 * @param {TokenLists} tokenLists
 * @return {void}
 */
function writeDeclaration(record, nodes, tokenLists) {
  if (!record.marked) return;
  const node = /** @type {import('postcss').Declaration} */ (
    nodeOf(nodes, record.index)
  );
  node.prop = record.prop;
  node.value = tokensText(tokenLists.get(record.valueList));
  delete node.raws.value;
}

/**
 * Writes the marked declarations of the chain of the rule at `index`, in place.
 *
 * @param {BlockRecords} records
 * @param {NodeTable} nodes
 * @param {TokenLists} tokenLists
 * @param {number} index the rule's index
 * @return {void}
 */
function writeDeclarationsOf(records, nodes, tokenLists, index) {
  for (
    let entry = records.links.firstChild(index);
    entry !== -1;
    entry = records.links.nextSibling(entry)
  ) {
    const record = records.entry(entry);
    if (record.kind === DECLARATION)
      writeDeclaration(record, nodes, tokenLists);
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
 * @param {TokenLists} tokenLists the run's token lists, which the ids of the rules name
 * @param {TextTable} [textTable] the table the selectors are written through
 * @return {void}
 */
export function writeBack(
  records,
  nodes,
  tokenLists,
  textTable = new TextTable()
) {
  if (records.consistencyChecks && nodes.length !== records.builtCount) {
    throw new Error(TABLE_LENGTH);
  }
  assertTemplatesHaveNodes(records, nodes);
  /** @type {Rebuilt[]} */
  const rebuilt = [];
  /** @param {ContainerRecord} container */
  const visit = (container) => {
    if (differs(records, nodes, container)) {
      createChildNodes(records, nodes, container.index, tokenLists);
      rebuilt.push({
        container: /** @type {Container} */ (nodeOf(nodes, container.index)),
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
        writeSelector(record, nodes, textTable, tokenLists);
        if (record.context !== -1) {
          visit(record);
        } else {
          if (records.links.isEdited(record.index)) {
            createChildNodes(records, nodes, record.index, tokenLists);
            rebuilt.push({
              container: /** @type {Container} */ (nodeOf(nodes, record.index)),
              children: childNodesOf(records, nodes, record.index),
              leading: null,
            });
          }
          if (records.declarationStamps.isTouched(record.index)) {
            writeDeclarationsOf(records, nodes, tokenLists, record.index);
          }
        }
      } else if (record.kind === STYLESHEET || record.kind === AT_RULE_BLOCK) {
        visit(record);
      } else if (record.kind === DECLARATION) {
        writeDeclaration(record, nodes, tokenLists);
      }
    }
  };
  visit(records.root);
  replaceChildren(rebuilt);
  const rootNode = /** @type {Root} */ (nodeOf(nodes, records.root.index));
  if (records.root.after !== null) rootNode.raws.after = records.root.after;
  writeRawsOf(records, nodes, tokenLists, records.root.index);
  // The first child of the stylesheet takes the leading whitespace last.
  const root = /** @type {Container} */ (nodeOf(nodes, records.root.index));
  const first = root.first;
  const { leadingWhitespace } = records;
  if (first && leadingWhitespace !== null) {
    first.raws.before = leadingWhitespace;
  }
}
