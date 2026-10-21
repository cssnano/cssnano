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
 * A root only detaches: PostCSS rewrites the leading whitespace of nodes
 * inserted into a root, which the rebuild does not reproduce.
 *
 * @param {Container} container
 * @return {void}
 */
export declare function applyChildEdits(container: Container): void;
//# sourceMappingURL=deferredChildEdits.d.ts.map