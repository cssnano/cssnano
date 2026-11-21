import type { BlockDeclarations } from '../blockDeclarations.js';
/**
 * Property names are CSS identifiers, so engines match their decoded
 * spelling: `\61 ll` is `all`. A malformed name matches no property.
 *
 * @param {string} prop - a name containing an escape
 * @return {string | undefined}
 */
export declare function decodedPropertyName(prop: string): string | undefined;
/**
 * @param {{ prop: string }} declaration a declaration item
 * @return {boolean}
 */
export declare function isAll(declaration: {
    prop: string;
}): boolean;
/**
 * Whether a property occurs twice without an `all` reset in between.
 *
 * @param {BlockDeclarations} list
 * @param {readonly number[]} laneDecls positions in `list`
 * @return {boolean}
 */
export declare function repeatsProperty(list: BlockDeclarations, laneDecls: readonly number[]): boolean;
/**
 * @param {BlockDeclarations} list
 * @param {readonly number[]} declarations positions in `list`
 * @return {boolean} whether a declaration other than `all` is present, so that
 * a lane of only `all` declarations can be skipped
 */
export declare function hasNonAll(list: BlockDeclarations, declarations: readonly number[]): boolean;
//# sourceMappingURL=importanceLanes.d.ts.map