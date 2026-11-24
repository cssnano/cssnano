/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {TokenizeMode} from '../../values/valueBuffer.js' */
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
import { tokenizeMode, tokenizeModeOfKeys } from '../../values/tokenizeMode.js';
import { escapedSpaceOf, separatorOf } from './escapedSpace.js';

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
 * The tokenizer mode of a declaration's values. The keys fold an escaped name
 * to the name it denotes, but the mode keeps the raw spelling's lowercase, as
 * it always has, so an escaped name keeps the default mode.
 *
 * @param {string} prop the property as written
 * @param {{ unicodeRange: boolean }} keys the keys of the property
 * @return {TokenizeMode | undefined}
 */
function valueModeOf(prop, keys) {
  return prop.includes('\\') ? tokenizeMode(prop) : tokenizeModeOfKeys(keys);
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
  const keys = context.names.keysOf(node.prop);
  const mode = valueModeOf(node.prop, keys);
  const valueList = valueListOf(node, context, mode, written, kept);
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
  record.writtenList = writtenValueListOf(node, context, mode, written, kept);
  return record;
}

/**
 * The id of an at-rule's prelude: the list of its params, interned in the run,
 * so equal preludes share an id. The separator's escaped space, when there is
 * one, is the prelude's last character, as the grammar reads it.
 *
 * @param {import('postcss').AtRule} node
 * @param {RunContext} context
 * @param {string} space the escaped space, or ''
 * @return {TokenListId}
 */
function preludeIdOf(node, context, space) {
  // A node a plugin created may have no params, which its prelude spells as none.
  const params = node.params ?? '';
  return context.valueIds.idOf(
    context.tokenLists,
    undefined,
    space === '' ? params : params + space
  );
}

/**
 * The list of an at-rule's params as written, when its prelude does not spell
 * them: params that dropped a comment. -1 otherwise.
 *
 * @param {import('postcss').AtRule} node
 * @param {RunContext} context
 * @param {string} space the escaped space, or ''
 * @return {TokenListId | -1}
 */
function writtenPreludeOf(node, context, space) {
  const params = node.params ?? '';
  const written = sourceParams(node) ?? '';
  if (written === params) return -1;
  return context.valueIds.idOf(
    context.tokenLists,
    undefined,
    space === '' ? written : written + space
  );
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
    // A node a plugin emptied may have no child list, which holds no children.
    for (const child of /** @type {ChildNode[]} */ (node.nodes ?? [])) {
      if (child.type === 'rule') {
        this.#fillRule(container, child);
      } else if (child.type === 'atrule' && child.nodes) {
        this.#fillBlock(container, child);
      } else if (child.type === 'decl') {
        this.place(
          container.index,
          recordDeclaration(child, this.context),
          child
        );
      } else if (child.type === 'atrule') {
        this.#fillStatement(container, child);
      } else {
        this.#fillComment(container, /** @type {Comment} */ (child));
      }
    }
  }

  /**
   * Places a rule in its container, then fills its children. A rule that holds
   * a rule or an at-rule nests, and gets its context.
   *
   * @param {BlockRecord | RuleRecord} container
   * @param {Rule} child
   * @return {void}
   */
  #fillRule(container, child) {
    const { context } = this;
    const { tokenLists, selectorIds } = context;
    const written = sourceSelector(child);
    const space = escapedSpaceOf(written, child.raws.between);
    const writtenList = context.valueIds.selectorListIdOf(
      tokenLists,
      space === '' ? written : written + space
    );
    const writtenTokens = tokenLists.get(writtenList);
    const record = new RuleRecord(
      child.raws.before ?? null,
      selectorIds.idsOfList(tokenLists, writtenTokens)
    );
    record.writtenList = writtenList;
    holdContainerRaws(record, child);
    record.between = separatorOf(child.raws.between, space) ?? null;
    this.place(container.index, record, child);
    if (child.nodes.some(isRuleOrAtRule)) {
      record.context = containerContext(
        context.declarations,
        container.context,
        record
      );
    }
    this.fillChildren(record, child);
  }

  /**
   * Places an at-rule block in its container, then fills its children.
   *
   * @param {BlockRecord | RuleRecord} container
   * @param {AtRule} child
   * @return {void}
   */
  #fillBlock(container, child) {
    const { context } = this;
    const space = escapedSpaceOf(sourceParams(child) ?? '', child.raws.between);
    const nested = /** @type {BlockRecord} */ (
      this.#atRuleRecord(AT_RULE_BLOCK, child, space)
    );
    holdContainerRaws(nested, child);
    nested.between = separatorOf(child.raws.between, space) ?? null;
    this.place(container.index, nested, child);
    nested.context = containerContext(
      context.declarations,
      container.context,
      nested
    );
    this.fillChildren(nested, child);
  }

  /**
   * Builds the record of an at-rule with a block or a statement. Both take the
   * same name, category, prelude, written prelude and afterName.
   *
   * @param {typeof AT_RULE_BLOCK | typeof AT_RULE_STATEMENT} kind
   * @param {AtRule} child
   * @param {string} space the escaped space of the prelude, from escapedSpaceOf
   * @return {BlockRecord | NodeEntry}
   */
  #atRuleRecord(kind, child, space) {
    const { context } = this;
    const { tokenLists } = context;
    const name = recordNameOf(child.name);
    const category = atRuleKindOf(name);
    const preludeId = preludeIdOf(child, context, space);
    const anonymous =
      category === LAYER && isAnonymousLayer(tokenLists.get(preludeId));
    const before = child.raws.before ?? null;
    const record =
      kind === AT_RULE_BLOCK
        ? new BlockRecord(kind, before, category, name, anonymous, preludeId)
        : new NodeEntry(kind, before, category, name, anonymous, preludeId);
    record.writtenList = writtenPreludeOf(child, context, space);
    record.afterName = child.raws.afterName ?? null;
    return record;
  }

  /**
   * Places an at-rule statement, which has no children, in its container.
   *
   * @param {BlockRecord | RuleRecord} container
   * @param {AtRule} child
   * @return {void}
   */
  #fillStatement(container, child) {
    const space = escapedSpaceOf(sourceParams(child) ?? '', child.raws.between);
    const entry = /** @type {NodeEntry} */ (
      this.#atRuleRecord(AT_RULE_STATEMENT, child, space)
    );
    entry.between = separatorOf(child.raws.between, space) ?? null;
    this.place(container.index, entry, child);
  }

  /**
   * Places a comment in its container.
   *
   * @param {BlockRecord | RuleRecord} container
   * @param {Comment} child
   * @return {void}
   */
  #fillComment(container, child) {
    const text = child.text;
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
