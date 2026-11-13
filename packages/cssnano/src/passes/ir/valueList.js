import cssnanoUtils from '#utils';
import { holdsImportantComment } from './holdsImportantComment.js';
import { tokenizeMode } from '../../values/tokenizeMode.js';

/** @import {TokenLists, TokenListId} from './tokenLists.js' */
/** @import {ValueIds} from './valueIds.js' */
/** @import {TextTable} from '../../values/textTable.js' */
/** @import {Declaration} from 'postcss' */

const { sourceValue } = cssnanoUtils;

/**
 * The tables a declaration's value is interned in: the run's text table and
 * its token lists and value ids.
 *
 * @typedef {{ textTable: TextTable, tokenLists: TokenLists, valueIds: ValueIds }} ValueTables
 */

/**
 * Whether a declaration's value as written holds an important comment, which
 * the cleaned value would drop.
 *
 * @param {Declaration} node
 * @param {TextTable} textTable
 * @return {boolean}
 */
function keepsValueAsWritten(node, textTable) {
  return (
    sourceValue(node).includes('/*') &&
    holdsImportantComment(textTable.tokens(node))
  );
}

/**
 * The id of the value a declaration's record holds. A value with an important
 * comment is kept as written, since the comment is part of what the author kept;
 * any other value is the cleaned `value`, which PostCSS gives. The id interns
 * the text, so a value new to the run is tokenized once, in its property's mode.
 *
 * @param {Declaration} node
 * @param {ValueTables} tables
 * @return {TokenListId}
 */
export function valueListOf(node, tables) {
  const { textTable, tokenLists, valueIds } = tables;
  const mode = tokenizeMode(node.prop);
  if (keepsValueAsWritten(node, textTable)) {
    const written = sourceValue(node);
    return valueIds.idOf(tokenLists, mode, written);
  }
  // The stored tokens spell the written text, which is the cleaned value only
  // when no comment was stripped from it.
  // The table's tokens are the default tokenizer's, so a mode reads its own.
  const stored =
    mode === undefined && sourceValue(node) === node.value
      ? textTable.stored(node)
      : undefined;
  return valueIds.idOf(tokenLists, mode, node.value, stored);
}

/**
 * The list of a declaration's value as written, when the value list does not
 * spell it: a cleaned value that dropped a plain comment. A value kept as
 * written, and a value PostCSS cleaned of nothing, have none, so -1.
 *
 * @param {Declaration} node
 * @param {ValueTables} tables
 * @return {TokenListId | -1}
 */
export function writtenValueListOf(node, tables) {
  const written = sourceValue(node);
  if (written === node.value || keepsValueAsWritten(node, tables.textTable)) {
    return -1;
  }
  const { tokenLists, valueIds } = tables;
  return valueIds.idOf(tokenLists, tokenizeMode(node.prop), written);
}
