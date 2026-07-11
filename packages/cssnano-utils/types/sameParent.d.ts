export = sameParent;
export type Child = import('postcss').AnyNode & {
    parent?: Child;
};
/** @typedef {import('postcss').AnyNode & {parent?: Child}} Child */
/**
 * @param {Child} nodeA
 * @param {Child} nodeB
 * @return {boolean}
 */
declare function sameParent(nodeA: Child, nodeB: Child): boolean;
//# sourceMappingURL=sameParent.d.ts.map