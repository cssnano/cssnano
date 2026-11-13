import cssnanoUtils from '#utils';

/** @import {CSSToken} from '@csstools/css-tokenizer' */

const { TokenType, isImportantComment } = cssnanoUtils;

/**
 * Whether a value, as its tokens spell it, holds an important comment. The
 * longhand rounds keep such a declaration as written: they neither rewrite,
 * remove nor fold it, and no shorthand merges across it.
 *
 * @param {readonly CSSToken[]} tokens the tokens of the value as written
 * @return {boolean}
 */
export function holdsImportantComment(tokens) {
  return tokens.some(
    (token) =>
      token[0] === TokenType.Comment && isImportantComment(token[1].slice(2))
  );
}
