import { comma } from '../../values/punctuationTokens.js';
import { renumber } from '../../values/renumber.js';
import { nodeOf } from './nodeTable.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {Rule} from 'postcss' */
/** @import {RuleRecord} from './ruleRecord.js' */
/** @import {TextTable} from '../../values/textTable.js' */
/** @import {NodeTable} from './nodeTable.js' */
/** @import {TokenLists} from './tokenLists.js' */

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
 * @param {import('postcss').Rule} node the merged rule
 * @param {import('postcss').Rule} template the rule whose raw it prints
 * @return {void}
 */
function writeTemplateRaws(node, template) {
  node.raws.ownSemicolon = template.raws.ownSemicolon;
}

/**
 * Writes the selector of a marked rule the root reaches, through the table: its
 * written list when it has one, otherwise the tokens of its ids joined as the
 * rule is written. A rule that no merge marked keeps its node's text, so it is
 * not written.
 *
 * @param {RuleRecord} record
 * @param {NodeTable} nodes
 * @param {TextTable} textTable
 * @param {TokenLists} tokenLists
 * @return {void}
 */
export function writeSelector(record, nodes, textTable, tokenLists) {
  if (!record.marked) return;
  const node = /** @type {Rule} */ (nodeOf(nodes, record.index));
  const list =
    record.writtenList === -1
      ? joinedList(record, tokenLists)
      : tokenLists.get(record.writtenList);
  textTable.write(node, list);
  if (record.template !== -1) {
    writeTemplateRaws(
      node,
      /** @type {import('postcss').Rule} */ (nodeOf(nodes, record.template))
    );
  }
}
