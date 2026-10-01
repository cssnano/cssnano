import type { Container, Declaration } from 'postcss';
/**
 * Property names are CSS identifiers, so engines match their decoded
 * spelling: `\61 ll` is `all`. A malformed name matches no property.
 *
 * @param {string} prop - a name containing an escape
 * @return {string | undefined}
 */
export declare function decodedPropertyName(prop: string): string | undefined;
/**
 * @param {Declaration} declaration
 * @return {boolean}
 */
export declare function isAll(declaration: Declaration): boolean;
/**
 * Reconstruct the normal and important lanes in rule order. A matching `all`
 * declaration is retained only as a segment boundary for family reducers.
 *
 * @param {Container} rule
 * @param {Declaration[]} declarations
 * @return {[Declaration[], Declaration[]]}
 */
export declare function importanceLanes(rule: Container, declarations: Declaration[]): [Declaration[], Declaration[]];
/**
 * Apply declaration cleanup independently between matching `all` boundaries.
 *
 * @param {Declaration[][]} lanes
 * @param {(declarations: Set<Declaration>) => void} cleanup
 */
export declare function cleanupLaneSegments(lanes: Declaration[][], cleanup: (declarations: Set<Declaration>) => void): void;
//# sourceMappingURL=importanceLanes.d.ts.map