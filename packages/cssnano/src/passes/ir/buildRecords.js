/** @import {TokenLists, TokenListId} from './tokenLists.js' */
import cssnanoUtils from '#utils';
import { BlockRecords } from './blockRecords.js';
import { RuleRecord } from './ruleRecord.js';
import { SelectorIds } from './selectorIds.js';
import { DeclarationRecord } from './declarationRecord.js';
import { keysOfName } from './propertyTable.js';
import {
  AT_RULE_BLOCK,
  AT_RULE_STATEMENT,
  atRuleKindOf,
  BlockRecord,
  COMMENT,
  LAYER,
  NO_AT_RULE,
  NO_PRELUDE,
  NodeEntry,
  STYLESHEET,
} from './blockRecord.js';
import { containerContext } from '../merge/lib/rules/sameContainer.js';
import { valueListOf } from '../merge/lib/valueList.js';

const { asciiLowerCase, isAnonymousLayer } = cssnanoUtils;

/** @import {AtRule, ChildNode, Comment, Container, Declaration, Root, Rule} from 'postcss' */
/** @import {NodeTable} from './nodeTable.js' */
/** @import {DeclarationKeys} from './declarationKey.js' */
/** @import {ArenaIndex} from './blockRecord.js' */
/** @import MergeState from '../merge/lib/rules/mergeState.js' */
/** @import {RunContext} from './runContext.js' */

/**
 * Builds the records of a stylesheet from its tree, which the window's edits
 * then change. The build is the only code of the window that reads the nodes.
 */

/**
 * @param {ChildNode} node
 * @return {boolean} whether the node holds rules or at-rules
 */
export function isRuleOrAtRule(node) {
  return node.type === 'rule' || node.type === 'atrule';
}

/**
 * The ids of a rule's selector items, each new item given its list in the
 * run's table, in the order of the items.
 *
 * @param {SelectorIds} selectorIds
 * @param {TokenLists} tokenLists
 * @param {readonly string[]} items
 * @return {TokenListId[]}
 */
function idsOfItems(selectorIds, tokenLists, items) {
  const ids = [];
  for (const item of items) ids.push(selectorIds.idOf(tokenLists, item));
  return ids;
}

/**
 * The record of a declaration of the run's stylesheet.
 *
 * @param {Declaration} node
 * @param {RunContext} context
 * @return {DeclarationRecord}
 */
export function recordDeclaration(node, context) {
  const before = node.raws.before ?? null;
  const important = node.important === true;
  const valueList = valueListOf(node, context);
  const record = new DeclarationRecord(
    before,
    node.prop,
    valueList,
    important,
    keysOfName(node.prop),
    context.declarations.keyOf(node.prop, valueList, important, before),
    node.raws.between ?? null,
    important ? (node.raws.important ?? null) : null
  );
  return record;
}

/**
 * Builds the records of a stylesheet from its tree, once per run, and the node
 * of each of their entries. Each child is linked into the chain of its parent,
 * and every rule is a container whose children form its own chain.
 *
 * @param {Root} root
 * @param {RunContext} context the run's state, which gives the tokens and ids the records keep
 * @return {{records: BlockRecords, nodes: NodeTable}}
 */
export function buildRecords(root, context) {
  const { textTable, tokenLists, consistencyChecks } = context;
  // The ids of this build's selectors. Each rule keeps the ids of its items.
  const selectorIds = new SelectorIds();
  const records = new BlockRecords(
    new BlockRecord(STYLESHEET, '', NO_AT_RULE, '', '', false, NO_PRELUDE),
    consistencyChecks
  );
  /** @type {NodeTable} the node of each entry, by index; the root is entry 0 */
  const nodes = [root];
  records.leadingWhitespace = root.first?.raws.before ?? null;
  /**
   * Places a child's entry at the end of its container's chain, with its node.
   * An entry takes the next index, which is the next slot of the table.
   *
   * @param {number} container
   * @param {BlockRecord | RuleRecord | DeclarationRecord | NodeEntry} entry
   * @param {ChildNode} node
   */
  const place = (container, entry, node) => {
    records.appendEntry(container, entry);
    nodes.push(node);
  };
  /**
   * Links each child of a container, which holds its context already, in
   * document order. A rule is linked into its parent, then its children.
   *
   * @param {BlockRecord | RuleRecord} container
   * @param {Container} node the container's node
   * @return {void}
   */
  const fillChildren = (container, node) => {
    for (const child of /** @type {ChildNode[]} */ (node.nodes)) {
      if (child.type === 'rule') {
        const record = new RuleRecord(
          child.raws.before ?? null,
          idsOfItems(selectorIds, tokenLists, child.selectors)
        );
        place(container.index, record, child);
        // A rule that holds a rule or an at-rule nests, and gets its context.
        if (child.nodes.some(isRuleOrAtRule)) {
          record.context = containerContext(
            context.declarations,
            container.context,
            record
          );
        }
        fillChildren(record, child);
      } else if (child.type === 'atrule' && child.nodes) {
        const name = asciiLowerCase(child.name);
        const category = atRuleKindOf(name);
        const nested = new BlockRecord(
          AT_RULE_BLOCK,
          child.raws.before ?? null,
          category,
          name,
          child.params,
          category === LAYER && isAnonymousLayer(child, textTable),
          context.declarations.preludeId(child)
        );
        place(container.index, nested, child);
        nested.context = containerContext(
          context.declarations,
          container.context,
          nested
        );
        fillChildren(nested, child);
      } else if (child.type === 'decl') {
        place(container.index, recordDeclaration(child, context), child);
      } else if (child.type === 'atrule') {
        const name = asciiLowerCase(child.name);
        const category = atRuleKindOf(name);
        const entry = new NodeEntry(
          AT_RULE_STATEMENT,
          child.raws.before ?? null,
          category,
          name,
          child.params,
          category === LAYER && isAnonymousLayer(child, textTable),
          context.declarations.preludeId(child)
        );
        place(container.index, entry, child);
      } else {
        const text = /** @type {Comment} */ (child).text;
        const entry = new NodeEntry(
          COMMENT,
          child.raws.before ?? null,
          NO_AT_RULE,
          '',
          '',
          false,
          NO_PRELUDE,
          text,
          cssnanoUtils.isImportantComment(text)
        );
        place(container.index, entry, child);
      }
    }
  };
  // The stylesheet's context is the one for no enclosing container.
  records.root.context = containerContext(
    context.declarations,
    -1,
    records.root
  );
  fillChildren(records.root, root);
  records.settle();
  return { records, nodes };
}
