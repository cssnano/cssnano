export type Child = import('postcss').AnyNode & {
    parent?: Child;
};
/** @typedef {import('postcss').AnyNode & {parent?: Child}} Child */
/**
 * True if two containers apply their content the same way: they are equal
 * blocks, and so are their enclosing blocks up to the stylesheet. Either may
 * be missing, for a node that is detached.
 *
 * @param {import('postcss').Container | undefined} containerA
 * @param {import('postcss').Container | undefined} containerB
 * @return {boolean}
 */
export declare function sameContainer(containerA: import('postcss').Container | undefined, containerB: import('postcss').Container | undefined): boolean;
//# sourceMappingURL=sameContainer.d.ts.map