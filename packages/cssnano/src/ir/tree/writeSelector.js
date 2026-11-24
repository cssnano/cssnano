import { comma } from '../../values/punctuationTokens.js';
import { renumber } from '../../values/renumber.js';
import { nodeOf } from './nodeTable.js';
import { sourceParams, sourceSelector } from '../../utils/sourceText.js';
import { tokensText } from '../../values/tokensText.js';
import { escapedSpaceOf, trailingEscapedSpace } from './escapedSpace.js';
import { RULE } from '../blockRecord.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {AtRule, Rule} from 'postcss' */
/** @import {RuleRecord} from '../ruleRecord.js' */
/** @import {BlockRecord, NodeEntry} from '../blockRecord.js' */
/** @import {NodeTable} from './nodeTable.js' */
/** @import {TokenListId, TokenLists} from '../tokenLists.js' */

/**
 * The tokens of a marked rule's selector as it is written: the lists of its
 * ids, joined by a bare comma. The lists are shared, and renumbering copies
 * only the tokens whose positions move.
 *
 * @param {RuleRecord} record
 * @param {TokenLists} tokenLists
 * @return {CSSToken[]}
 */
function joinedList(record, tokenLists) {
  /** @type {CSSToken[]} */
  const joined = [];
  const { selectorIds } = record;
  for (let index = 0; index < selectorIds.length; index++) {
    if (index > 0) joined.push(comma());
    for (const token of tokenLists.get(selectorIds[index])) joined.push(token);
  }
  renumber(joined);
  return joined;
}

/**
 * Gives a merged rule the own semicolon of its template. The records hold the
 * other raws the merged rule prints, so this is the one raw left to copy from a
 * node.
 *
 * @param {Rule} node the merged rule
 * @param {Rule} template the rule whose raw it prints
 * @return {void}
 */
function writeTemplateRaws(node, template) {
  node.raws.ownSemicolon = template.raws.ownSemicolon;
}

/**
 * Writes the head of a marked rule or at-rule and its separator. The head is
 * the selector or the prelude as its record spells it. A backslash before a
 * space or tab that ends the marked head escapes it, so the character goes back
 * to the front of the separator, where the parser puts it.
 *
 * An unmarked head keeps its node's text. Its character is read from the node's
 * own separator, which the build left unchanged.
 *
 * @param {RuleRecord | BlockRecord | NodeEntry} record
 * @param {Rule | AtRule} node
 * @param {TokenLists} tokenLists
 * @return {void}
 */
export function writeHead(record, node, tokenLists) {
  const rule = record.kind === RULE;
  /** @type {string | null} the head to assign, or null to keep the node's */
  let head = null;
  let space = '';
  if (record.marked) {
    const text = rule
      ? tokensText(
          record.writtenList === -1
            ? joinedList(/** @type {RuleRecord} */ (record), tokenLists)
            : tokenLists.get(record.writtenList)
        )
      : tokensText(
          tokenLists.get(
            /** @type {TokenListId} */ (
              /** @type {BlockRecord} */ (record).preludeId
            )
          )
        );
    // A null separator keeps the head whole, since the node has none to take the character.
    if (record.between !== null) space = trailingEscapedSpace(text);
    head = space === '' ? text : text.slice(0, text.length - space.length);
  } else if (record.between !== null) {
    space = rule
      ? escapedSpaceOf(
          sourceSelector(/** @type {Rule} */ (node)),
          node.raws.between
        )
      : escapedSpaceOf(
          sourceParams(/** @type {AtRule} */ (node)) ?? '',
          node.raws.between
        );
  }
  if (head !== null) {
    if (rule) {
      const selector = /** @type {Rule} */ (node);
      if (sourceSelector(selector) !== head) {
        selector.selector = head;
        delete selector.raws.selector;
      }
    } else {
      const atRule = /** @type {AtRule} */ (node);
      atRule.params = head;
      delete atRule.raws.params;
    }
  }
  if (record.between !== null) {
    node.raws.between = space === '' ? record.between : space + record.between;
  }
}

/**
 * Writes the selector and the separator of a rule the root reaches, then the
 * template raw of a merged rule. A rule that no merge marked keeps its node's
 * selector, as the head is written only when it differs from the node's.
 *
 * @param {RuleRecord} record
 * @param {NodeTable} nodes
 * @param {TokenLists} tokenLists
 * @return {void}
 */
export function writeSelector(record, nodes, tokenLists) {
  const node = /** @type {Rule} */ (nodeOf(nodes, record.index));
  writeHead(record, node, tokenLists);
  if (record.marked && record.template !== -1) {
    writeTemplateRaws(
      node,
      /** @type {Rule} */ (nodeOf(nodes, record.template))
    );
  }
}
