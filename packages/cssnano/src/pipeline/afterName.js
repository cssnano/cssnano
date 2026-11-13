import cssnanoUtils from '#utils';
import { writeAfterName } from '../passes/ir/rawEdits.js';

/** @import {CSSToken, TokenType} from '@csstools/css-tokenizer' */
/** @import {ArenaIndex, BlockRecord, NodeEntry} from '../passes/ir/blockRecord.js' */
/** @import {BlockRecords} from '../passes/ir/blockRecords.js' */

/**
 * Strips the whitespace from the space after an at-rule name. Its comments stay,
 * since they are content that a browser may need to see.
 *
 * @param {string | null} raw
 * @returns {string}
 */
function stripWhitespacePreservingComments(raw) {
  if (!raw?.includes('/*')) return '';
  let result = '';
  for (const [type, tokenRaw] of cssnanoUtils.tokens(raw)) {
    if (type !== cssnanoUtils.TokenType.Whitespace) result += tokenRaw;
  }
  return result;
}

/**
 * Whether the brackets of the tokens close in order. It keeps no map of the
 * pairs, so a list that balances costs one pass.
 *
 * @param {readonly CSSToken[]} list
 * @return {boolean}
 */
function bracketsBalance(list) {
  /** @type {TokenType[]} */
  const expected = [];
  for (const [type] of list) {
    const close = cssnanoUtils.closeForOpening(type);
    if (close !== undefined) {
      expected.push(close);
    } else if (
      type === cssnanoUtils.TokenType.CloseParen ||
      type === cssnanoUtils.TokenType.CloseSquare ||
      type === cssnanoUtils.TokenType.CloseCurly
    ) {
      if (expected.pop() !== type) return false;
    }
  }
  return expected.length === 0;
}

/**
 * Whether the space after an at-rule name can go for a prelude: its first token
 * is a parenthesis, and its brackets balance. A prelude's text starts with `(`
 * exactly when its first token is an open parenthesis.
 *
 * @param {readonly CSSToken[]} list the tokens that spell the prelude after the walk
 * @return {boolean}
 */
export function startsWithBalancedParen(list) {
  return (
    list.length > 0 &&
    list[0][0] === cssnanoUtils.TokenType.OpenParen &&
    bracketsBalance(list)
  );
}

/**
 * Sets the space after an at-rule name for the prelude that the walk wrote. An
 * empty prelude takes no space. A prelude that starts with a parenthesis takes
 * none either, unless its brackets do not balance, when the name's space is
 * left as written.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} index the at-rule's record
 * @param {boolean} empty whether the prelude after the walk is empty
 * @param {boolean} startsBalanced whether the prelude starts with a balanced
 *   parenthesis, as startsWithBalancedParen tells
 * @return {void}
 */
export function tightenAfterName(records, index, empty, startsBalanced) {
  const record = /** @type {BlockRecord | NodeEntry} */ (records.entry(index));
  if (empty) {
    writeAfterName(records, index, '');
  } else if (
    startsBalanced &&
    !cssnanoUtils.endsWithEscapingBackslash(record.name)
  ) {
    writeAfterName(
      records,
      index,
      stripWhitespacePreservingComments(record.afterName)
    );
  }
}
