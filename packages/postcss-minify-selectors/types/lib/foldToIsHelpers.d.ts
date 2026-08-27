/** @typedef {import('postcss-selector-parser').Node} Node */
/** @typedef {import('postcss-selector-parser').Selector} Selector */
/** @typedef {import('postcss-selector-parser').Pseudo} Pseudo */
export type Node = import('postcss-selector-parser').Node;
export type Selector = import('postcss-selector-parser').Selector;
export type Pseudo = import('postcss-selector-parser').Pseudo;
export type Token = {
    kind: 'compound' | 'combinator';
    str: string;
    nodes?: Node[];
};
export type Specificity = [number, number, number];
/**
 * @param {Selector} selector
 * @return {Token[]}
 */
declare function tokenize(selector: Selector): Token[];
/**
 * @param {Token} token
 * @return {boolean}
 */
declare function hasPseudoElementOrNesting(token: Token): boolean;
/**
 * @param {Token} token
 * @return {boolean}
 */
declare function hasNthChildOfClause(token: Token): boolean;
/**
 * @param {Token} token
 * @return {boolean}
 */
declare function hasUnsafeForFold(token: Token): boolean;
/**
 * @param {Node[]} nodes
 * @return {Specificity}
 */
declare function specificityOf(nodes: Node[]): Specificity;
/**
 * @param {Pseudo} pseudo
 * @return {Specificity}
 */
declare function maxChildSpecificity(pseudo: Pseudo): Specificity;
/**
 * Sums the specificity of compound tokens in a fold middle — the divergent
 * portion of a selector list, between the shared prefix and shared suffix.
 *
 * @param {Token[]} middle
 * @return {Specificity}
 */
declare function specificityOfMiddle(middle: Token[]): Specificity;
/**
 * @param {Specificity} a
 * @param {Specificity} b
 * @return {number}
 */
declare function compareSpecificity(a: Specificity, b: Specificity): number;
/**
 * @param {Specificity} a
 * @param {Specificity} b
 * @return {boolean}
 */
declare function equalSpecificity(a: Specificity, b: Specificity): boolean;
/**
 * @param {Token[]} tokens
 * @return {string}
 */
declare function joinTokens(tokens: Token[]): string;
export { tokenize, hasPseudoElementOrNesting, hasNthChildOfClause, hasUnsafeForFold, specificityOf, specificityOfMiddle, maxChildSpecificity, compareSpecificity, equalSpecificity, joinTokens, };
//# sourceMappingURL=foldToIsHelpers.d.ts.map