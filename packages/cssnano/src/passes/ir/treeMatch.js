import cssnanoUtils from '#utils';
import {
  AT_RULE_BLOCK,
  AT_RULE_STATEMENT,
  atRuleKindOf,
  COMMENT,
  DECLARATION,
  RULE,
  STYLESHEET,
} from './blockRecord.js';
import { tokensText } from '../../values/tokensText.js';
import { nodeOf } from './nodeTable.js';
import { isRuleOrAtRule } from './buildRecords.js';
import { differs } from './writeBack.js';
import { summariesHold } from '../merge/lib/rules/selectorReads.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {AtRule, ChildNode, Declaration, Root, Rule} from 'postcss' */
/** @import {BlockRecords} from './blockRecords.js' */
/** @import {NodeTable} from './nodeTable.js' */
/** @import {DeclarationRecord} from './declarationRecord.js' */
/** @import {BlockRecord as Block, NodeEntry} from './blockRecord.js' */
/** @import {ContainerRecord} from './writeBack.js' */
/** @import {RuleRecord} from './ruleRecord.js' */
/** @import {TokenLists} from './tokenLists.js' */

const { asciiLowerCase, isImportantComment, sourceValue, TokenType } =
  cssnanoUtils;

/**
 * @param {CSSToken} token
 * @return {boolean} whether the token is a comment that `!` marks as important
 */
function isImportantCommentToken(token) {
  return (
    token[0] === TokenType.Comment && isImportantComment(token[1].slice(2))
  );
}

const OUT_OF_STEP = 'block record out of step with the tree';
const STALE = 'stale declarations of a rule record';
const SUMMARIES = 'stored summaries of a rule differ from the fold of its ids';

/**
 * Whether a declaration record describes the declaration node it stands for, in
 * the facts a record keeps, the spellings of its colon and important flag included.
 * A value list with an important comment spells the value as written; any
 * other spells the node's value.
 *
 * @param {TokenLists} tokenLists
 * @param {DeclarationRecord} record
 * @param {ChildNode | Root | undefined} node the node the record stands for
 * @return {boolean}
 */
function describesNode(tokenLists, record, node) {
  const declaration = /** @type {Declaration} */ (node);
  const important = declaration.important === true;
  const list = tokenLists.get(record.valueList);
  const spelled = list.some(isImportantCommentToken)
    ? sourceValue(declaration)
    : declaration.value;
  return (
    record.prop === declaration.prop &&
    tokensText(list) === spelled &&
    record.important === important &&
    record.between === (declaration.raws.between ?? null) &&
    record.importantSpelling ===
      (important ? (declaration.raws.important ?? null) : null)
  );
}

/**
 * Throws when an at-rule record names another kind, name or prelude than the
 * at-rule the tree holds. The prelude id is not compared, since it counts the
 * raws too.
 *
 * @param {NodeTable} nodes
 * @param {Block | NodeEntry} entry
 * @return {void}
 */
function checkAtRuleFacts(nodes, entry) {
  const node = /** @type {AtRule} */ (nodeOf(nodes, entry.index));
  if (node.type !== 'atrule') return;
  const name = asciiLowerCase(node.name);
  if (
    entry.atRuleKind !== atRuleKindOf(name) ||
    entry.name !== name ||
    entry.params !== node.params
  ) {
    throw new Error(OUT_OF_STEP);
  }
}

/**
 * Throws when a rule's ids do not spell the items of its node's selector list:
 * the list of each id spells the item at its place.
 *
 * @param {TokenLists} tokenLists
 * @param {RuleRecord} record
 * @param {Rule} rule
 * @return {void}
 */
function checkRuleSelectors(tokenLists, record, rule) {
  const items = rule.selectors;
  const { selectorIds } = record;
  if (selectorIds.length !== items.length) throw new Error(OUT_OF_STEP);
  for (let at = 0; at < items.length; at++) {
    if (tokensText(tokenLists.get(selectorIds[at])) !== items[at]) {
      throw new Error(OUT_OF_STEP);
    }
  }
}

/**
 * Throws when the record of a rule is not linked in the container that holds
 * it, does not nest exactly when the tree's rule holds rules or at-rules, or
 * its selectors differ from the tree's.
 *
 * @param {BlockRecords} records
 * @param {NodeTable} nodes
 * @param {TokenLists} tokenLists
 * @param {ContainerRecord} block the container whose chain holds the rule
 * @param {RuleRecord} record
 * @return {void}
 */
function checkRuleRecord(records, nodes, tokenLists, block, record) {
  const rule = /** @type {Rule} */ (nodeOf(nodes, record.index));
  if (records.links.parentOf(record.index) !== block.index) {
    throw new Error(OUT_OF_STEP);
  }
  const nests = record.context !== -1;
  if (nests !== rule.nodes.some(isRuleOrAtRule)) {
    throw new Error(OUT_OF_STEP);
  }
  checkRuleSelectors(tokenLists, record, rule);
  checkBlockRecord(records, nodes, tokenLists, record);
}

/**
 * Throws when the live children of a container are not the nodes it holds, and
 * checks the rule records and nested blocks its chain links. A plain rule's
 * declarations must also describe their nodes, and its children must be its
 * nodes' children.
 *
 * @param {BlockRecords} records
 * @param {NodeTable} nodes
 * @param {TokenLists} tokenLists
 * @param {ContainerRecord} block
 * @return {void}
 */
function checkBlockRecord(records, nodes, tokenLists, block) {
  if (differs(records, nodes, block)) throw new Error(OUT_OF_STEP);
  const plain = block.kind === RULE && block.context === -1;
  for (
    let entry = records.links.firstChild(block.index);
    entry !== -1;
    entry = records.links.nextSibling(entry)
  ) {
    const item = records.entry(entry);
    // The first child of the stylesheet prints the stylesheet's leading
    // whitespace instead of its own.
    const expected =
      block === records.root && entry === records.links.firstChild(block.index)
        ? records.leadingWhitespace
        : item.before;
    if (
      expected !== null &&
      /** @type {ChildNode} */ (nodeOf(nodes, entry)).raws.before !== expected
    ) {
      throw new Error(STALE);
    }
    if (item.kind === RULE) {
      checkRuleRecord(records, nodes, tokenLists, block, item);
    } else if (item.kind === STYLESHEET || item.kind === AT_RULE_BLOCK) {
      checkAtRuleFacts(nodes, item);
      checkBlockRecord(records, nodes, tokenLists, item);
    } else {
      if (item.kind === COMMENT || item.kind === AT_RULE_STATEMENT) {
        checkAtRuleFacts(nodes, item);
      }
      if (plain) {
        if (
          item.kind === DECLARATION &&
          !describesNode(tokenLists, item, nodeOf(nodes, item.index))
        ) {
          throw new Error(STALE);
        }
        if (
          /** @type {ChildNode} */ (nodeOf(nodes, entry)).parent !==
          nodeOf(nodes, block.index)
        ) {
          throw new Error(OUT_OF_STEP);
        }
      }
    }
  }
}

/**
 * Under consistency checks, throws when the records and the tree disagree:
 * each container must hold the nodes it holds, in order, each rule must
 * stand in the slot its record names, and its selectors must spell the tree's.
 * Writes nothing.
 *
 * @param {BlockRecords} records
 * @param {NodeTable} nodes
 * @param {TokenLists} tokenLists the run's token lists, which the ids name
 * @param {readonly string[]} browsers the target browsers, which the summaries fold
 * @return {void}
 */
export function assertRecordsMatchTree(records, nodes, tokenLists, browsers) {
  if (!records.consistencyChecks) return;
  checkBlockRecord(records, nodes, tokenLists, records.root);
  if (!summariesHold(records, tokenLists, browsers)) throw new Error(SUMMARIES);
}
