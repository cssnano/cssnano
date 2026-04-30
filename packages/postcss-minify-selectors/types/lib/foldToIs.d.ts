export type Token = {
    kind: "compound" | "combinator";
    str: string;
    nodes?: import("postcss-selector-parser").Node[] | undefined;
};
export type Specificity = [number, number, number];
/**
 * Returns the folded selector list string if beneficial, otherwise null.
 *
 * @param {import('postcss-selector-parser').Root} root
 * @return {string | null}
 */
export function tryFold(root: import("postcss-selector-parser").Root): string | null;
/**
 * @typedef {object} Token
 * @property {'compound'|'combinator'} kind
 * @property {string} str
 * @property {import('postcss-selector-parser').Node[]} [nodes]
 */
/**
 * @param {import('postcss-selector-parser').Selector} selector
 * @return {Token[]}
 */
export function tokenize(selector: import("postcss-selector-parser").Selector): Token[];
/**
 * Pseudo-elements cannot live inside `:is()`; nesting `&` would change meaning.
 *
 * @param {Token} token
 * @return {boolean}
 */
export function hasPseudoElementOrNesting(token: Token): boolean;
/**
 * `:nth-child(An+B of S)` / `:nth-last-child(An+B of S)` add the specificity
 * of `S` to the pseudo-class. The selector parser flattens `An+B` and the
 * `of S` clause into a single child selector, so we can't cleanly recover S's
 * spec. Reject folding any compound that uses this syntax to stay safe.
 *
 * @param {Token} token
 * @return {boolean}
 */
export function hasNthChildOfClause(token: Token): boolean;
/** @typedef {[number, number, number]} Specificity */
/**
 * Specificity contribution of a list of simple-selector nodes, following the
 * nested-specificity rules for `:is()`, `:not()`, `:has()`, and `:where()`.
 *
 * @param {import('postcss-selector-parser').Node[]} nodes
 * @return {Specificity}
 */
export function specificityOf(nodes: import("postcss-selector-parser").Node[]): Specificity;
/**
 * @param {Token[]} middle
 * @return {Specificity}
 */
export function specificityOfMiddle(middle: Token[]): Specificity;
/**
 * @param {import('postcss-selector-parser').Pseudo} pseudo
 * @return {Specificity}
 */
export function maxChildSpecificity(pseudo: import("postcss-selector-parser").Pseudo): Specificity;
/**
 * @param {Specificity} a
 * @param {Specificity} b
 * @return {number}
 */
export function compareSpecificity(a: Specificity, b: Specificity): number;
/**
 * @param {Specificity} a
 * @param {Specificity} b
 * @return {boolean}
 */
export function sameSpecificity(a: Specificity, b: Specificity): boolean;
//# sourceMappingURL=foldToIs.d.ts.map