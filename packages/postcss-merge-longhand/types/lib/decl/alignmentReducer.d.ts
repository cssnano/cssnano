import type { Container, Declaration } from 'postcss';
import type { AlignmentFamilyConfig } from './alignmentForms.js';
export type ParsedDeclarations = Map<Declaration, [string | null, string | null]>;
/**
 * Reduces paired box alignment longhand declarations within a container into
 * shorthand. Existing shorthands are normalized by the shorthand folding pass.
 *
 * @param {Container} rule
 * @param {AlignmentFamilyConfig} family
 * @param {Declaration[]} declarations
 * @param {[Declaration[], Declaration[]]} [lanes] - the declarations and `all`
 *   split by importance, when the caller already collected them
 * @return {void}
 */
export declare function reduceAlignmentFamily(rule: Container, family: AlignmentFamilyConfig, declarations: Declaration[], lanes?: [Declaration[], Declaration[]]): void;
//# sourceMappingURL=alignmentReducer.d.ts.map