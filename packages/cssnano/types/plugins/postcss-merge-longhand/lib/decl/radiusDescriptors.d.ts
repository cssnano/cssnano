import { parseCornerRadius, parseRadiusShorthand } from '../validateRadius.js';
import type { Container, Declaration } from 'postcss';
export type RadiusDeclarationDescriptor = {
    decl: Declaration;
    prop?: string;
    val?: string;
    isBarrier: boolean;
    isHacked?: boolean;
    isGlobalKeyword?: boolean;
    isShorthand?: boolean;
    longhandIndex?: number;
    canExplode?: boolean;
    parsed?: ReturnType<typeof parseRadiusShorthand> | ReturnType<typeof parseCornerRadius> | null;
};
/**
 * Partitions family lanes into descriptor lanes.
 * @param {Container} rule
 * @param {[Declaration[], Declaration[]]} familyLanes
 * @return {{ lanes: [RadiusDeclarationDescriptor[], RadiusDeclarationDescriptor[]], radiusDescriptors: RadiusDeclarationDescriptor[] } | null}
 */
export declare function partitionLanes(rule: Container, familyLanes: [Declaration[], Declaration[]]): {
    lanes: [RadiusDeclarationDescriptor[], RadiusDeclarationDescriptor[]];
    radiusDescriptors: RadiusDeclarationDescriptor[];
} | null;
//# sourceMappingURL=radiusDescriptors.d.ts.map