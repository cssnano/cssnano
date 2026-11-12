import type { AlignmentFamilyConfig } from './alignmentForms.js';
import type { BlockDeclarations } from '../blockDeclarations.js';
export type ParsedDeclarations = Map<number, [string | null, string | null]>;
/**
 * Reduces paired box alignment longhand declarations within a container into
 * shorthand. Existing shorthands are normalized by the shorthand folding pass.
 *
 * @param {BlockDeclarations} list
 * @param {AlignmentFamilyConfig} family
 * @param {number[]} declarations - positions in `list`
 * @param {[number[], number[]]} lanes - the declarations and `all` split by
 *   importance
 * @return {void}
 */
export declare function reduceAlignmentFamily(list: BlockDeclarations, family: AlignmentFamilyConfig, declarations: number[], lanes: [number[], number[]]): void;
//# sourceMappingURL=alignmentReducer.d.ts.map