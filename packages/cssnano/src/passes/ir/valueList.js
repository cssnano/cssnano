import { holdsImportantComment } from './holdsImportantComment.js';
import { tokenizeMode } from '../../values/tokenizeMode.js';
import { tokens } from '../../utils/value.js';

/** @import {TokenLists, TokenListId} from './tokenLists.js' */
/** @import {ValueIds} from './valueIds.js' */
/** @import {Declaration} from 'postcss' */

/**
 * The tables a declaration's value is interned in: its token lists and value
 * ids.
 *
 * @typedef {{ tokenLists: TokenLists, valueIds: ValueIds }} ValueTables
 */

/**
 * Whether a value as written holds an important comment, which the cleaned
 * value would drop. Only a value with a comment start is tokenized.
 *
 * @param {string} written the value as written
 * @return {boolean}
 */
export function keepsValueAsWritten(written) {
  return written.includes('/*') && holdsImportantComment(tokens(written));
}

/**
 * The id of the value a declaration's record holds. A value with an important
 * comment is kept as written, since the comment is part of what the author kept;
 * any other value is the cleaned `value`, which PostCSS gives. The id interns
 * the text, so a value new to the run is tokenized once, in its property's mode.
 *
 * @param {Declaration} node
 * @param {ValueTables} tables
 * @param {string} written the value as written, which the caller reads once
 * @param {boolean} kept whether the value keeps an important comment
 * @return {TokenListId}
 */
export function valueListOf(node, tables, written, kept) {
  const { tokenLists, valueIds } = tables;
  const mode = tokenizeMode(node.prop);
  return valueIds.idOf(tokenLists, mode, kept ? written : node.value);
}

/**
 * The list of a declaration's value as written, when the value list does not
 * spell it: a cleaned value that dropped a plain comment. A value kept as
 * written, and a value PostCSS cleaned of nothing, have none, so -1.
 *
 * @param {Declaration} node
 * @param {ValueTables} tables
 * @param {string} written the value as written, which the caller reads once
 * @param {boolean} kept whether the value keeps an important comment
 * @return {TokenListId | -1}
 */
export function writtenValueListOf(node, tables, written, kept) {
  if (written === node.value || kept) return -1;
  const { tokenLists, valueIds } = tables;
  return valueIds.idOf(tokenLists, tokenizeMode(node.prop), written);
}
