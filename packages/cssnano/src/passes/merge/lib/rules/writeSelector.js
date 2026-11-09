import { comma } from '../../../../values/punctuationTokens.js';
import { joinRanges } from '../../../../values/joinRanges.js';
import { tokensText } from '../../../../values/tokensText.js';

/** @import {Rule} from 'postcss' */
/** @import {BlockRecords} from './blockRecords.js' */
/** @import {RuleRecord} from './ruleRecord.js' */
/** @import {TextTable} from '../../../../values/textTable.js' */

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
 * Writes the selector of a rule the root reaches, through the table: the text,
 * and the tokens the record holds or joins from its pieces. Then stores the
 * tokens of an unmarked rule that the compatibility check tokenized, so a later
 * reader of the table does not tokenize them again.
 *
 * @param {RuleRecord} record
 * @param {BlockRecords} records
 * @param {TextTable} textTable
 * @return {void}
 */
export function writeSelector(record, records, textTable) {
  const node = /** @type {Rule} */ (records.nodeOf(record.index));
  if (record.marked) {
    const list = record.tokens ?? joinedPieces(record);
    if (list === undefined) {
      textTable.setText(node, record.selector);
    } else {
      textTable.write(node, list);
      record.markStored();
    }
    if (record.template !== -1) {
      writeTemplateRaws(
        node,
        /** @type {import('postcss').Rule} */ (records.nodeOf(record.template))
      );
    }
  } else if (record.tokens !== undefined && !record.listStored) {
    textTable.write(node, record.tokens);
    record.markStored();
  }
}
