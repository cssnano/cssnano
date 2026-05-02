export type Token = {
    kind: "compound" | "combinator";
    str: string;
    nodes?: import("postcss-selector-parser").Node[] | undefined;
};
export type Specificity = [number, number, number];
/**
 * @typedef {object} Token
 * @property {'compound'|'combinator'} kind
 * @property {string} str
 * @property {import('postcss-selector-parser').Node[]} [nodes]
 */
/** @typedef {[number, number, number]} Specificity */
/**
 * @param {import('postcss-selector-parser').Selector} selector
 * @return {Token[]}
 */
export function tokenize(selector: import("postcss-selector-parser").Selector): Token[];
/**
 * @param {Token} token
 * @return {boolean}
 */
export function hasPseudoElementOrNesting(token: Token): boolean;
/**
 * @param {Token} token
 * @return {boolean}
 */
export function hasNthChildOfClause(token: Token): boolean;
/**
 * @param {import('postcss-selector-parser').Node[]} nodes
 * @return {Specificity}
 */
export function specificityOf(nodes: import("postcss-selector-parser").Node[]): Specificity;
/**
 * Sums the specificity of compound tokens in a fold middle — the divergent
 * portion of a selector list, between the shared prefix and shared suffix.
 *
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
export function equalSpecificity(a: Specificity, b: Specificity): boolean;
/**
 * @param {Token[]} tokens
 * @return {string}
 */
export function joinTokens(tokens: Token[]): string;
//# sourceMappingURL=foldToIsHelpers.d.ts.map