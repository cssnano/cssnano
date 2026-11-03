/** @import {ChildNode, Container} from 'postcss'; */
import type { ChildNode, Container } from 'postcss';
/**
 * Whether the container has edits that its child list does not show yet.
 *
 * @param {Container} container
 * @return {boolean}
 */
export declare function hasPendingEdits(container: Container): boolean;
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
 * A root only detaches: PostCSS rewrites the leading whitespace of nodes
 * inserted into a root, which the rebuild does not reproduce.
 *
 * @param {Container} container
 * @return {void}
 */
export declare function applyChildEdits(container: Container): void;
//# sourceMappingURL=deferredChildEdits.d.ts.map