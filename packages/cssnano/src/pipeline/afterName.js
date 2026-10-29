import cssnanoUtils from '#utils';

/** @import {CSSToken, TokenType} from '@csstools/css-tokenizer' */
/** @import {AtRule} from 'postcss' */

/**
 * Strips the whitespace from the space after an at-rule name. Its comments stay,
 * since they are content that a browser may need to see.
 *
 * @param {string | undefined} raw
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
 * Whether the space after an at-rule name can go for a prelude: it starts with
 * a parenthesis, and its brackets balance. The tokens spell the prelude.
 *
 * @param {string} prelude the prelude after the walk
 * @param {readonly CSSToken[] | undefined} list the tokens that spell it
 * @return {boolean}
 */
export function startsWithBalancedParen(prelude, list) {
  return prelude.startsWith('(') && list !== undefined && bracketsBalance(list);
}

/**
 * Sets the space after an at-rule name for the prelude that the walk wrote. An
 * empty prelude takes no space. A prelude that starts with a parenthesis takes
 * none either, unless its brackets do not balance, when the prelude is left as
 * written.
 *
 * @param {import('postcss').AtRule} atRule
 * @param {string} prelude the prelude after the walk
 * @param {boolean} startsBalanced whether the prelude starts with a balanced
 *   parenthesis, as startsWithBalancedParen tells
 */
export function tightenAfterName(atRule, prelude, startsBalanced) {
  if (prelude.length === 0) {
    atRule.raws.afterName = '';
  } else if (
    startsBalanced &&
    !cssnanoUtils.endsWithEscapingBackslash(atRule.name)
  ) {
    atRule.raws.afterName = stripWhitespacePreservingComments(
      atRule.raws.afterName
    );
  }
}
