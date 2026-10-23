/** @import {Declaration} from 'postcss' */

/**
 * Removes the stray semicolons that the raw whitespace before a declaration
 * keeps, as `a{color:red;;_color:blue}` does. A declaration that opens its
 * container, or follows a rule, keeps its raw, since the parser gives no
 * semicolon there that the output needs to drop.
 *
 * @param {Declaration} decl
 * @returns {void}
 */
export function stripStrayRawSemicolon(decl) {
  const { before } = decl.raws;
  if (!before?.includes(';')) return;
  const prev = decl.prev();
  if (prev && prev.type !== 'rule') {
    decl.raws.before = before.replaceAll(';', '');
  }
}
