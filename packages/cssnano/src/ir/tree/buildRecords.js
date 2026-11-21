/** @import {TokenLists, TokenListId} from '../tokenLists.js' */
import cssnanoUtils from '#utils';
import { sourceParams, sourceSelector } from '../../utils/sourceText.js';
import { BlockRecords } from '../blockRecords.js';
import { RuleRecord } from '../ruleRecord.js';
import { DeclarationRecord } from '../declarationRecord.js';
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
} from '../blockRecord.js';
import { containerContext } from './sameContainer.js';
import {
  keepsValueAsWritten,
  valueListOf,
  writtenValueListOf,
} from '../valueList.js';
import { selectorItemsOf } from '../selectorItems.js';

/** @import {SelectorIds} from '../selectorIds.js' */
const { asciiLowerCase, isAnonymousLayer, sourceValue } = cssnanoUtils;

/**
 * The name a record holds: the ASCII-folded name, except that `@CHARSET` keeps
 * its spelling. Browsers read an encoding only from the exact lowercase bytes,
 * so any other case is an ordinary unknown at-rule.
 *
 * @param {string} written
 * @return {string}
 */
export function recordNameOf(written) {
  const folded = asciiLowerCase(written);
  return folded === 'charset' ? written : folded;
}

/** @import {AtRule, ChildNode, Comment, Container, Declaration, Root, Rule} from 'postcss' */
/** @import {NodeTable} from './nodeTable.js' */
/** @import {DeclarationKeys} from '../declarationKey.js' */
/** @import {ArenaIndex} from '../blockRecord.js' */
/** @import MergeState from '../../merge/rules/mergeState.js' */
/** @import {RunContext} from '../../run/runContext.js' */

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
 * Gives a container record the raws its node holds between its prelude or
 * selector and its children, and after them.
 *
 * @param {RuleRecord | BlockRecord} record
 * @param {Rule | AtRule} node
 * @return {void}
 */
function holdContainerRaws(record, node) {
  record.between = node.raws.between ?? null;
  record.after = node.raws.after ?? null;
  record.semicolon = node.raws.semicolon ?? null;
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
  const written = sourceValue(node);
  const kept = keepsValueAsWritten(written);
  const valueList = valueListOf(node, context, written, kept);
  const keys = context.names.keysOf(node.prop);
  const record = new DeclarationRecord(
    before,
    node.prop,
    valueList,
    important,
    keys,
    context.declarations.keyOf(keys.id, valueList, important, before),
    node.raws.between ?? null,
    important ? (node.raws.important ?? null) : null
  );
  record.writtenList = writtenValueListOf(node, context, written, kept);
  return record;
}

/**
 * The id of an at-rule's prelude: the list of its params, interned in the run,
 * so equal preludes share an id.
 *
 * @param {import('postcss').AtRule} node
 * @param {RunContext} context
 * @return {TokenListId}
 */
function preludeIdOf(node, context) {
  // A node a plugin created may have no params, which its prelude spells as none.
  const params = node.params ?? '';
  return context.valueIds.idOf(context.tokenLists, undefined, params);
}

/**
 * The list of an at-rule's params as written, when its prelude does not spell
 * them: params that dropped a comment. -1 otherwise.
 *
 * @param {import('postcss').AtRule} node
 * @param {RunContext} context
 * @return {TokenListId | -1}
 */
function writtenPreludeOf(node, context) {
  const params = node.params ?? '';
  const written = sourceParams(node) ?? '';
  if (written === params) return -1;
  return context.valueIds.idOf(context.tokenLists, undefined, written);
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
  const records = new BlockRecords(
    new BlockRecord(STYLESHEET, '', NO_AT_RULE, '', false, NO_PRELUDE),
    context.consistencyChecks
  );
  const build = new RecordBuild(records, root, context);
  records.root.after = root.raws.after ?? null;
  // The stylesheet's context is the one for no enclosing container.
  records.root.context = containerContext(
    context.declarations,
    -1,
    records.root
  );
  build.fillChildren(records.root, root);
  records.settle();
  return { records, nodes: build.nodes };
}

/** The records and the node table that one build fills in document order. */
class RecordBuild {
  /**
   * @param {BlockRecords} records
   * @param {Root} root
   * @param {RunContext} context the run's state, which gives the tokens and ids the records keep
   */
  constructor(records, root, context) {
    this.records = records;
    this.context = context;
    /** @type {NodeTable} the node of each entry, by index; the root is entry 0 */
    this.nodes = [root];
  }

  /**
   * Places a child's entry at the end of its container's chain, with its node.
   * An entry takes the next index, which is the next slot of the table.
   *
   * @param {number} container
   * @param {BlockRecord | RuleRecord | DeclarationRecord | NodeEntry} entry
   * @param {ChildNode} node
   */
  place(container, entry, node) {
    this.records.appendEntry(container, entry);
    this.nodes.push(node);
  }

  /**
   * Links each child of a container, which holds its context already, in
   * document order. A rule is linked into its parent, then its children.
   *
   * @param {BlockRecord | RuleRecord} container
   * @param {Container} node the container's node
   * @return {void}
   */
  fillChildren(container, node) {
    const { context } = this;
    const { tokenLists, selectorIds } = context;
    // A node a plugin emptied may have no child list, which holds no children.
    for (const child of /** @type {ChildNode[]} */ (node.nodes ?? [])) {
      if (child.type === 'rule') {
        const writtenList = context.valueIds.idOf(
          tokenLists,
          undefined,
          sourceSelector(child)
        );
        const record = new RuleRecord(
          child.raws.before ?? null,
          idsOfItems(
            selectorIds,
            tokenLists,
            selectorItemsOf(tokenLists.get(writtenList))
          )
        );
        record.writtenList = writtenList;
        holdContainerRaws(record, child);
        this.place(container.index, record, child);
        // A rule that holds a rule or an at-rule nests, and gets its context.
        if (child.nodes.some(isRuleOrAtRule)) {
          record.context = containerContext(
            context.declarations,
            container.context,
            record
          );
        }
        this.fillChildren(record, child);
      } else if (child.type === 'atrule' && child.nodes) {
        const name = recordNameOf(child.name);
        const category = atRuleKindOf(name);
        const preludeId = preludeIdOf(child, context);
        const nested = new BlockRecord(
          AT_RULE_BLOCK,
          child.raws.before ?? null,
          category,
          name,
          category === LAYER && isAnonymousLayer(tokenLists.get(preludeId)),
          preludeId
        );
        nested.writtenList = writtenPreludeOf(child, context);
        holdContainerRaws(nested, child);
        nested.afterName = child.raws.afterName ?? null;
        this.place(container.index, nested, child);
        nested.context = containerContext(
          context.declarations,
          container.context,
          nested
        );
        this.fillChildren(nested, child);
      } else if (child.type === 'decl') {
        this.place(container.index, recordDeclaration(child, context), child);
      } else if (child.type === 'atrule') {
        const name = recordNameOf(child.name);
        const category = atRuleKindOf(name);
        const preludeId = preludeIdOf(child, context);
        const entry = new NodeEntry(
          AT_RULE_STATEMENT,
          child.raws.before ?? null,
          category,
          name,
          category === LAYER && isAnonymousLayer(tokenLists.get(preludeId)),
          preludeId
        );
        entry.writtenList = writtenPreludeOf(child, context);
        entry.between = child.raws.between ?? null;
        entry.afterName = child.raws.afterName ?? null;
        this.place(container.index, entry, child);
      } else {
        const text = /** @type {Comment} */ (child).text;
        const entry = new NodeEntry(
          COMMENT,
          child.raws.before ?? null,
          NO_AT_RULE,
          '',
          false,
          NO_PRELUDE,
          text,
          cssnanoUtils.isImportantComment(text)
        );
        this.place(container.index, entry, child);
      }
    }
  }
}
