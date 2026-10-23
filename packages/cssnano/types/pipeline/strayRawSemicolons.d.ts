/** @import {Declaration} from 'postcss' */
import type { Declaration } from 'postcss';
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
//# sourceMappingURL=strayRawSemicolons.d.ts.map