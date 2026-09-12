import type { Declaration, Rule } from 'postcss';
/**
 * Property names are CSS identifiers, so match their decoded spelling. A
 * malformed property fails closed and cannot become a segment boundary.
 *
 * @param {Declaration} declaration
 * @return {boolean}
 */
export declare function isAll(declaration: Declaration): boolean;
/**
 * Reconstruct the normal and important lanes in rule order. A matching `all`
 * declaration is retained only as a segment boundary for family reducers.
 *
 * @param {Rule} rule
 * @param {Declaration[]} declarations
 * @return {[Declaration[], Declaration[]]}
 */
export declare function importanceLanes(rule: Rule, declarations: Declaration[]): [Declaration[], Declaration[]];
/**
 * Apply declaration cleanup independently between matching `all` boundaries.
 *
 * @param {[Declaration[], Declaration[]]} lanes
 * @param {(declarations: Set<Declaration>) => void} cleanup
 */
export declare function cleanupLaneSegments(lanes: [Declaration[], Declaration[]], cleanup: (declarations: Set<Declaration>) => void): void;
//# sourceMappingURL=importanceLanes.d.ts.map