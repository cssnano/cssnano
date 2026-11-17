import {
  AT_RULE_BLOCK,
  AT_RULE_STATEMENT,
  DECLARATION,
  RULE,
} from '../blockRecord.js';
import { tokensText } from '../../values/tokensText.js';
import { createChildNodes, nodeOf } from './nodeTable.js';
import { writeSelector } from './writeSelector.js';
import { assertTemplatesHaveNodes } from './recordsCheck.js';

/** @import {AtRule, ChildNode, Container, Declaration, Root, Rule} from 'postcss' */
/** @import {BlockRecords} from '../blockRecords.js' */
/** @import {NodeTable} from './nodeTable.js' */
/** @import {BlockRecord as Block, NodeEntry} from '../blockRecord.js' */
/** @import {RuleRecord} from '../ruleRecord.js' */
/** @import {TokenListId, TokenLists} from '../tokenLists.js' */
/** @import {DeclarationRecord} from '../declarationRecord.js' */

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
    /** @type {Container} */ (nodeOf(nodes, block.index)).nodes ?? []
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
  for (const { container, children } of rebuilt) {
    // A rule kept from the source still points at its former container.
    for (const node of children) node.parent = undefined;
    container.append(children);
  }
}

/**
 * Assigns the separator and the important spelling that a declaration's record
 * holds. An unmarked declaration keeps its value, so its spellings are written
 * here, not by writeDeclaration.
 *
 * @param {DeclarationRecord} record
 * @param {Declaration} node
 * @return {void}
 */
function writeDeclarationRaws(record, node) {
  if (record.between !== null) node.raws.between = record.between;
  if (record.importantSpelling !== null) {
    node.raws.important = record.importantSpelling;
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
 * The write-back of one run. Its walks keep their state in fields, not in
 * closures: `rebuilt` is the containers that take new children, in walk order.
 */
class WriteBack {
  /** @type {BlockRecords} */
  records;

  /** @type {NodeTable} */
  nodes;

  /** @type {TokenLists} */
  tokenLists;

  /** @type {Rebuilt[]} */
  rebuilt = [];

  /**
   * @param {BlockRecords} records
   * @param {NodeTable} nodes the node of each entry, from the build
   * @param {TokenLists} tokenLists the run's token lists, which the ids of the rules name
   */
  constructor(records, nodes, tokenLists) {
    this.records = records;
    this.nodes = nodes;
    this.tokenLists = tokenLists;
  }

  /**
   * Gives the containers the edits changed their children, then writes the
   * fields of every record the root reaches.
   *
   * @return {void}
   */
  run() {
    this.#collect(this.records.root);
    replaceChildren(this.rebuilt);
    this.#writeFields(this.records.root);
  }

  /**
   * Collects each container whose chain an edit changed, with the children the
   * records hold, and recurses into the rules and at-rule blocks it reaches.
   *
   * @param {ContainerRecord} container
   * @return {void}
   */
  #collect(container) {
    const { records, nodes, tokenLists } = this;
    if (records.links.isEdited(container.index)) {
      createChildNodes(records, nodes, container.index, tokenLists);
      this.rebuilt.push({
        container: /** @type {Container} */ (nodeOf(nodes, container.index)),
        children: childNodesOf(records, nodes, container.index),
      });
    }
    for (
      let entry = records.links.firstChild(container.index);
      entry !== -1;
      entry = records.links.nextSibling(entry)
    ) {
      const record = records.entry(entry);
      if (record.kind === RULE || record.kind === AT_RULE_BLOCK) {
        this.#collect(/** @type {ContainerRecord} */ (record));
      }
    }
  }

  /**
   * Writes the whitespace, the raws and the marked fields of each live child of
   * the container, then those of the children of each rule and block below it.
   *
   * @param {ContainerRecord} container
   * @return {void}
   */
  #writeFields(container) {
    const { records, nodes, tokenLists } = this;
    for (
      let entry = records.links.firstChild(container.index);
      entry !== -1;
      entry = records.links.nextSibling(entry)
    ) {
      const record = records.entry(entry);
      const node = /** @type {ChildNode} */ (nodeOf(nodes, entry));
      // A null whitespace is the node having none, so the printer infers it.
      if (record.before !== null) node.raws.before = record.before;
      else delete node.raws.before;
      if (record.kind === DECLARATION) {
        writeDeclaration(record, nodes, tokenLists);
        writeDeclarationRaws(record, /** @type {Declaration} */ (node));
      } else if (record.kind === RULE) {
        writeSelector(record, nodes, tokenLists);
        writeContainerRaws(record, /** @type {Rule} */ (node));
        this.#writeFields(record);
      } else if (record.kind === AT_RULE_BLOCK) {
        writeContainerRaws(record, /** @type {AtRule} */ (node));
        writeParams(record, /** @type {AtRule} */ (node), tokenLists);
        if (record.afterName !== null) {
          /** @type {AtRule} */ (node).raws.afterName = record.afterName;
        }
        this.#writeFields(record);
      } else if (record.kind === AT_RULE_STATEMENT) {
        writeStatementRaws(record, /** @type {AtRule} */ (node));
        writeParams(record, /** @type {AtRule} */ (node), tokenLists);
      }
    }
  }
}

/**
 * Walks the live tree from the root and writes the records back to the nodes:
 * the children of the containers an edit changed, the selectors and the marked
 * fields of the rules, and the raws of every live child. A record the root does
 * not reach, dropped, keeps its node as it is, and a merged rule the root does
 * not reach gets none.
 *
 * @param {BlockRecords} records
 * @param {NodeTable} nodes the node of each entry, from the build; write-back adds the merged rules' nodes
 * @param {TokenLists} tokenLists the run's token lists, which the ids of the rules name
 * @return {void}
 */
export function writeBack(records, nodes, tokenLists) {
  if (records.consistencyChecks && nodes.length !== records.builtCount) {
    throw new Error(TABLE_LENGTH);
  }
  assertTemplatesHaveNodes(records, nodes);
  new WriteBack(records, nodes, tokenLists).run();
  const rootNode = /** @type {Root} */ (nodeOf(nodes, records.root.index));
  if (records.root.after !== null) rootNode.raws.after = records.root.after;
}
