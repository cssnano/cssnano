import cssnanoUtils from '#utils';

/** @import {Declaration} from 'postcss' */
/** @import {TextTable} from '../../../../values/textTable.js' */

const { TokenType, isImportantComment, sourceValue } = cssnanoUtils;

/**
 * Whether the value as written holds an important comment. The longhand rounds
 * keep such a declaration as written: they neither rewrite, remove nor fold it,
 * and no shorthand merges across it.
 *
 * @param {TextTable} textTable
 * @param {Declaration} decl
 * @return {boolean}
 */
export function keepsValueAsWritten(textTable, decl) {
  if (!sourceValue(decl).includes('/*')) return false;
  return textTable
    .tokens(decl)
    .some(
      (token) =>
        token[0] === TokenType.Comment && isImportantComment(token[1].slice(2))
    );
}
