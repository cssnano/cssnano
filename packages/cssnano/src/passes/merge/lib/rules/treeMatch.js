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
import { tokensText } from '../../../../values/tokensText.js';
import { nodeOf } from './nodeTable.js';
import { isRuleOrAtRule } from './buildRecords.js';
import { differs } from './writeBack.js';

/** @import {AtRule, Declaration, Root, Rule} from 'postcss' */
/** @import {BlockRecords} from './blockRecords.js' */
/** @import {NodeTable} from './nodeTable.js' */
/** @import {DeclarationRecord} from '../../../ir/declarationRecord.js' */
/** @import {ChildNode} from 'postcss' */
/** @import {BlockRecord as Block, NodeEntry} from './blockRecord.js' */
/** @import {ContainerRecord} from './writeBack.js' */
/** @import {RuleRecord} from './ruleRecord.js' */

const { asciiLowerCase } = cssnanoUtils;

const OUT_OF_STEP = 'block record out of step with the tree';
const STALE = 'stale declarations of a rule record';

/**
 * Whether a declaration record describes the declaration node it stands for, in
 * the facts a record keeps.
 *
 * @param {DeclarationRecord} record
 * @param {ChildNode | Root | undefined} node the node the record stands for
 * @return {boolean}
 */
function describesNode(record, node) {
  const declaration = /** @type {Declaration} */ (node);
  return (
    record.prop === declaration.prop &&
    record.value === declaration.value &&
    record.important === (declaration.important === true)
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
  if (nodeOf(nodes, entry.index)?.type !== 'atrule') return;
  const node = /** @type {AtRule} */ (nodeOf(nodes, entry.index));
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
 * Throws when the record of a rule is not linked in the container that holds
 * it, or does not nest exactly when the tree's rule holds rules or at-rules.
 *
 * @param {BlockRecords} records
 * @param {NodeTable} nodes
 * @param {ContainerRecord} block the container whose chain holds the rule
 * @param {RuleRecord} record
 * @return {void}
 */
function checkRuleRecord(records, nodes, block, record) {
  const rule = /** @type {Rule} */ (nodeOf(nodes, record.index));
  if (records.links.parentOf(record.index) !== block.index) {
    throw new Error(OUT_OF_STEP);
  }
  const nests = record.context !== -1;
  if (nests !== rule.nodes.some(isRuleOrAtRule)) {
    throw new Error(OUT_OF_STEP);
  }
  const { tokens } = record;
  if (tokens !== undefined && tokensText(tokens) !== record.sourceText) {
    throw new Error(OUT_OF_STEP);
  }
  checkBlockRecord(records, nodes, record);
}

/**
 * Throws when the live children of a container are not the nodes it holds, and
 * checks the rule records and nested blocks its chain links. A plain rule's
 * declarations must also describe their nodes, and its children must be its
 * nodes' children.
 *
 * @param {BlockRecords} records
 * @param {NodeTable} nodes
 * @param {ContainerRecord} block
 * @return {void}
 */
function checkBlockRecord(records, nodes, block) {
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
        ? block.leadingWhitespace
        : item.before;
    if (
      expected !== null &&
      /** @type {ChildNode} */ (nodeOf(nodes, entry)).raws.before !== expected
    ) {
      throw new Error(STALE);
    }
    if (item.kind === RULE) {
      checkRuleRecord(records, nodes, block, item);
    } else if (item.kind === STYLESHEET || item.kind === AT_RULE_BLOCK) {
      checkAtRuleFacts(nodes, item);
      checkBlockRecord(records, nodes, item);
    } else {
      if (item.kind === COMMENT || item.kind === AT_RULE_STATEMENT) {
        checkAtRuleFacts(nodes, item);
      }
      if (plain) {
        if (
          item.kind === DECLARATION &&
          !describesNode(item, nodeOf(nodes, item.index))
        ) {
          throw new Error(STALE);
        }
        if (nodeOf(nodes, entry)?.parent !== nodeOf(nodes, block.index)) {
          throw new Error(OUT_OF_STEP);
        }
      }
    }
  }
}

/**
 * Under consistency checks, throws when the records and the tree disagree:
 * each container must hold the nodes it holds, in order, and each rule must
 * stand in the slot its record names. Writes nothing.
 *
 * @param {BlockRecords} records
 * @param {NodeTable} nodes
 * @return {void}
 */
export function assertRecordsMatchTree(records, nodes) {
  if (!records.consistencyChecks) return;
  checkBlockRecord(records, nodes, records.root);
}
