import type { Declaration, Rule, Node } from 'postcss';
/** @import {Declaration, Rule, Node} from 'postcss'; */
/**
 * @param {Declaration} declaration one of `allPhysicalBorderProperties`
 * @return {boolean}
 */
export declare function browserKeeps(declaration: Declaration): boolean;
/**
 * @param {Rule} rule
 * @return {boolean}
 */
export declare function containsUnmergeableBorderDecls(rule: Rule): boolean;
/**
 * @param {Node} node
 * @return {boolean}
 */
declare function establishesBorderReset(node: Node): boolean;
/**
 * @param {Rule} rule
 * @return {boolean}
 */
export declare function hasBorderResetContext(rule: Rule): boolean;
export { establishesBorderReset };
//# sourceMappingURL=borderValidation.d.ts.map