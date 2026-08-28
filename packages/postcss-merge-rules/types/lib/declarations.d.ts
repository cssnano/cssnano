import type { Declaration } from 'postcss';
/**
 * @param {Declaration[]} array
 * @param {Declaration} decl
 * @return {number}
 */
export declare function indexOfDeclaration(array: Declaration[], decl: Declaration): number;
/**
 * @param {Declaration[]} a
 * @param {Declaration[]} b
 * @param {boolean} [not=false]
 * @return {Declaration[]}
 */
export declare function intersect(a: Declaration[], b: Declaration[], not?: boolean): Declaration[];
/**
 * @param {Declaration[]} a
 * @param {Declaration[]} b
 * @return {boolean}
 */
export declare function sameDeclarationsAndOrder(a: Declaration[], b: Declaration[]): boolean;
/**
 * @param {Declaration[]} hoistCandidates
 * @param {Declaration[]} earlierRuleDeclarations
 * @param {Declaration[]} laterRuleDeclarations
 * @return {{intersection: Declaration[], claimedIndices: Set<number>}}
 */
export declare function filterRuleIntersections(hoistCandidates: Declaration[], earlierRuleDeclarations: Declaration[], laterRuleDeclarations: Declaration[]): {
    intersection: Declaration[];
    claimedIndices: Set<number>;
};
//# sourceMappingURL=declarations.d.ts.map