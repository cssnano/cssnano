import type { AtRule, Declaration, Rule } from 'postcss';
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
export declare function stripStrayRawSemicolon(decl: Declaration): void;
/**
 * Gives the escaped character of a block back to its last declaration. The
 * parser puts that character in the raw after the block when the last
 * declaration has no semicolon, so the escape would otherwise be left dangling.
 *
 * @param {Rule | AtRule} node
 * @returns {void}
 */
export declare function reattachBlockEscape(node: Rule | AtRule): void;
//# sourceMappingURL=whitespaceRaws.d.ts.map