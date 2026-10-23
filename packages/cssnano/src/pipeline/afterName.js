import cssnanoUtils from '#utils';

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
 * Sets the space after an at-rule name for the prelude that the walk wrote. An
 * empty prelude takes no space. A prelude that starts with a parenthesis takes
 * none either, unless its brackets do not balance, when the prelude is left as
 * written.
 *
 * @param {import('postcss').AtRule} atRule
 * @param {string} prelude the prelude after the walk
 */
export function tightenAfterName(atRule, prelude) {
  if (prelude.length === 0) {
    atRule.raws.afterName = '';
  } else if (
    prelude.startsWith('(') &&
    !cssnanoUtils.endsWithEscapingBackslash(atRule.name) &&
    cssnanoUtils.balancedTokens(prelude)
  ) {
    atRule.raws.afterName = stripWhitespacePreservingComments(
      atRule.raws.afterName
    );
  }
}
