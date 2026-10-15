/** @import {ChildNode, Container} from 'postcss'; */
import type { ChildNode, Container } from 'postcss';
/**
 * @param {ChildNode} node
 * @return {void}
 */
export declare function detach(node: ChildNode): void;
/**
 * @param {Container} container
 * @param {ChildNode} anchor - an attached child of `container`, possibly one
 * inserted by an earlier pending edit
 * @param {ChildNode} node - a node without a parent
 * @return {void}
 */
export declare function insertAfter(container: Container, anchor: ChildNode, node: ChildNode): void;
/**
 * @param {Container} container - a rule or at-rule, never the root, whose
 * removal also moves the first child's leading whitespace
 * @return {void}
 */
export declare function applyChildEdits(container: Container): void;
//# sourceMappingURL=deferredChildEdits.d.ts.map