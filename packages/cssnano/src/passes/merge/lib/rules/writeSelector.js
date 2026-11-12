import { comma } from '../../../../values/punctuationTokens.js';
import { renumber } from '../../../../values/renumber.js';
import { nodeOf } from './nodeTable.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {Rule} from 'postcss' */
/** @import {RuleRecord} from './ruleRecord.js' */
/** @import {TextTable} from '../../../../values/textTable.js' */
/** @import {NodeTable} from './nodeTable.js' */
/** @import {TokenLists} from '../../../ir/tokenLists.js' */

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
 * Writes the selector of a marked rule the root reaches, through the table: the
 * tokens of its ids joined as the rule is written. A rule that no merge marked
 * keeps its node's text, so it is not written.
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
  textTable.write(node, joinedList(record, tokenLists));
  if (record.template !== -1) {
    writeTemplateRaws(
      node,
      /** @type {import('postcss').Rule} */ (nodeOf(nodes, record.template))
    );
  }
}
