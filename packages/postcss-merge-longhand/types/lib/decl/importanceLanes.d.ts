import type { Declaration } from 'postcss';
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
 * @param {Declaration[]} declarations
 * @return {boolean} whether a declaration other than `all` is present, so that
 * a lane of only `all` declarations can be skipped
 */
export declare function hasNonAll(declarations: Declaration[]): boolean;
//# sourceMappingURL=importanceLanes.d.ts.map