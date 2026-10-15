import type { Declaration } from 'postcss';
/** @import {Declaration} from 'postcss' */
/**
 * The comparison key for a property name. Standard property names are ASCII
 * case-insensitive, so their case folding must match; custom properties are
 * case-sensitive and keep their exact spelling.
 *
 * @param {string} prop
 * @return {string}
 */
export declare function propertyNameKey(prop: string): string;
/**
 * @param {Declaration} a
 * @param {Declaration} b
 * @return {boolean}
 */
export declare function declarationIsEqual(a: Declaration, b: Declaration): boolean;
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
 * @return {{intersection: Declaration[], claimedIndices: Set<number>, claimedEarlierIndices: Set<number>}}
 */
export declare function filterRuleIntersections(hoistCandidates: Declaration[], earlierRuleDeclarations: Declaration[], laterRuleDeclarations: Declaration[]): {
    intersection: Declaration[];
    claimedIndices: Set<number>;
    claimedEarlierIndices: Set<number>;
};
//# sourceMappingURL=declarations.d.ts.map