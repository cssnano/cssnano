import cssnanoUtils from '#utils';

/** @import {AtRule, ChildNode, Container, Declaration, Rule} from 'postcss' */

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

/**
 * Gives the escaped character of a block back to its last declaration. The
 * parser puts that character in the raw after the block when the last
 * declaration has no semicolon, so the escape would otherwise be left dangling.
 *
 * @param {Rule | AtRule} node
 * @returns {void}
 */
export function reattachBlockEscape(node) {
  const last = /** @type {ChildNode | undefined} */ (
    /** @type {Container} */ (node).last
  );
  if (
    last?.type === 'decl' &&
    cssnanoUtils.endsWithEscapingBackslash(last.value) &&
    node.raws.after
  ) {
    last.value += node.raws.after[0];
  }
}
