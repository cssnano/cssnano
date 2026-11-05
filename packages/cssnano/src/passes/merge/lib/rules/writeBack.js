import cssnanoUtils from '#utils';
import { consistencyChecksEnabled } from '../../../ir/consistencyChecks.js';
import { atRuleKind, BlockRecord, NodeEntry } from './blockRecord.js';
import { RuleRecord } from './ruleRecord.js';
import { DeclarationRecord } from '../../../ir/declarationRecord.js';
import { comma } from '../../../../values/punctuationTokens.js';
import { joinRanges } from '../../../../values/joinRanges.js';
import { TextTable } from '../../../../values/textTable.js';
import { tokensText } from '../../../../values/tokensText.js';

/** @import {AtRule, ChildNode, Container} from 'postcss' */
/** @import {BlockRecords} from './blockRecords.js' */
/** @import {BlockRecord as Block} from './blockRecord.js' */

/** @typedef {Block | RuleRecord} ContainerRecord a block, or a rule, whose children form its chain */

const { asciiLowerCase } = cssnanoUtils;

const OUT_OF_STEP = 'block record out of step with the tree';
const STALE = 'stale declarations of a rule record';

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
 * Whether a declaration record describes the declaration node it stands for, in
 * the facts a record keeps.
 *
 * @param {DeclarationRecord} child
 * @return {boolean}
 */
function describes(child) {
  const { node } = child;
  return (
    child.prop === node.prop &&
    child.value === node.value &&
    child.important === (node.important === true)
  );
}

/**
 * Throws when an at-rule record names another kind, name or prelude than the
 * at-rule the tree holds. The prelude id is not compared, since it counts the
 * raws too.
 *
 * @param {BlockRecord | NodeEntry} entry
 * @return {void}
 */
function checkAtRuleFacts(entry) {
  if (entry.node.type !== 'atrule') return;
  const node = /** @type {AtRule} */ (entry.node);
  const name = asciiLowerCase(node.name);
  if (
    entry.kind !== atRuleKind(name) ||
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
 * @param {ContainerRecord} block the container whose chain holds the rule
 * @param {RuleRecord} record
 * @return {void}
 */
function checkRuleRecord(records, block, record) {
  const rule = record.node;
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
  checkBlockRecord(records, record);
}

/**
 * Throws when the live children of a container are not the nodes it holds, and
 * checks the rule records and nested blocks its chain links. A plain rule's
 * declarations must also describe their nodes, and its children must be its
 * nodes' children.
 *
 * @param {BlockRecords} records
 * @param {ContainerRecord} block
 * @return {void}
 */
function checkBlockRecord(records, block) {
  if (differs(records, block)) throw new Error(OUT_OF_STEP);
  const plain = block instanceof RuleRecord && block.context === -1;
  for (
    let entry = records.links.firstChild(block.index);
    entry !== -1;
    entry = records.links.nextSibling(entry)
  ) {
    const item = records.entry(entry);
    if (item instanceof RuleRecord) {
      checkRuleRecord(records, block, item);
    } else if (item instanceof BlockRecord) {
      checkAtRuleFacts(item);
      checkBlockRecord(records, item);
    } else {
      if (item instanceof NodeEntry) checkAtRuleFacts(item);
      if (plain) {
        if (item instanceof DeclarationRecord && !describes(item)) {
          throw new Error(STALE);
        }
        if (records.nodeOf(entry).parent !== block.node) {
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
 * @return {void}
 */
export function assertRecordsMatchTree(records) {
  if (!consistencyChecksEnabled()) return;
  checkBlockRecord(records, records.root);
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
 * The tokens a marked rule's pieces join to, when they spell its selector as
 * it is written, or undefined.
 *
 * @param {RuleRecord} record
 * @return {readonly import('@csstools/css-tokenizer').CSSToken[] | undefined}
 */
function joinedPieces(record) {
  const { pieces } = record;
  if (!pieces) return undefined;
  const list = joinRanges(pieces, [comma()]);
  return tokensText(list) === record.selectorText() ? list : undefined;
}

/**
 * Gives a merged rule the raws that print its template: the space between the
 * selector and the block, the space after the block, and the semicolons.
 *
 * @param {import('postcss').Rule} node the merged rule
 * @param {import('postcss').Rule} template the rule whose raws it prints
 * @return {void}
 */
function writeTemplateRaws(node, template) {
  const { raws } = node;
  const source = template.raws;
  raws.between = source.between;
  raws.after = source.after;
  raws.semicolon = source.semicolon;
  raws.ownSemicolon = source.ownSemicolon;
}

/**
 * Writes the selector of each rule that a merge wrote, through the table: the
 * text, and the tokens the record holds or joins from its pieces. Then stores
 * the tokens of each other rule that the compatibility check tokenized, so a
 * later reader of the table does not tokenize them again. A departed rule has
 * nothing to write.
 *
 * @param {BlockRecords} records
 * @param {TextTable} textTable
 * @return {void}
 */
function writeSelectors(records, textTable) {
  for (let index = 0; index < records.entryCount(); index++) {
    const record = records.entry(index);
    if (!(record instanceof RuleRecord) || record.departed) continue;
    if (record.marked) {
      const list = record.tokens ?? joinedPieces(record);
      if (list === undefined) {
        textTable.setText(record.node, record.selector);
      } else {
        textTable.write(record.node, list);
        record.markStored();
      }
      if (record.template !== -1) {
        writeTemplateRaws(
          record.node,
          /** @type {import('postcss').Rule} */ (
            records.nodeOf(record.template)
          )
        );
      }
    } else if (record.tokens !== undefined && !record.listStored) {
      textTable.write(record.node, record.tokens);
      record.markStored();
    }
  }
}

/**
 * Assigns the whitespace before each live entry, and the entries of its
 * children, from the records, where a merge may have changed it. Runs after
 * the appends, so PostCSS's normalizing cannot change the value. A record whose
 * value is undefined leaves its node's whitespace as it is.
 *
 * @param {BlockRecords} records
 * @param {BlockRecord | RuleRecord} container
 * @return {void}
 */
function writeBefore(records, container) {
  for (
    let entry = records.links.firstChild(container.index);
    entry !== -1;
    entry = records.links.nextSibling(entry)
  ) {
    const item = records.entry(entry);
    const node = records.nodeOf(entry);
    if (item.before !== undefined && node.raws.before !== item.before) {
      node.raws.before = item.before;
    }
    if (item instanceof BlockRecord || item instanceof RuleRecord) {
      writeBefore(records, item);
    }
  }
}

/**
 * Writes the selectors, then gives each container in the live tree whose
 * children differ from its node the children the records hold, and each plain
 * rule that an edit changed the children of. A container that already matches
 * keeps its child list, and so does a plain rule that no edit touched. Dropped
 * and departed records are not in the tree, so they keep theirs.
 *
 * @param {BlockRecords} records
 * @param {TextTable} [textTable] the table the selectors are written through
 * @return {void}
 */
export function writeBack(records, textTable = new TextTable()) {
  writeSelectors(records, textTable);
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
      if (record instanceof RuleRecord) {
        if (record.context !== -1) {
          visit(record);
        } else if (record.edited) {
          rebuilt.push({
            container: /** @type {Container} */ (record.node),
            children: records.liveChildren(record.index),
            leading: undefined,
          });
        }
      } else if (record instanceof BlockRecord) {
        visit(record);
      }
    }
  };
  visit(records.root);
  replaceChildren(rebuilt);
  writeBefore(records, records.root);
  // The first child of the stylesheet takes the leading whitespace last.
  const first = records.root.node.first;
  const { leadingWhitespace } = records.root;
  if (first && leadingWhitespace !== undefined) {
    first.raws.before = leadingWhitespace;
  }
}
