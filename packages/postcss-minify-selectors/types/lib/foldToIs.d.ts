export = tryFold;
/**
 * Returns the folded selector list string if beneficial, otherwise null.
 *
 * @param {import('postcss-selector-parser').Root} root
 * @return {string | null}
 */
declare function tryFold(root: import("postcss-selector-parser").Root): string | null;
declare namespace tryFold {
    export { Token, Specificity };
}
type Token = {
    kind: "compound" | "combinator";
    str: string;
    nodes?: import("postcss-selector-parser").Node[] | undefined;
};
type Specificity = [number, number, number];
//# sourceMappingURL=foldToIs.d.ts.map