import { parseCornerRadius, parseRadiusShorthand } from '../validateRadius.js';
import type { BlockDeclarations } from '../blockDeclarations.js';
export type RadiusDeclarationDescriptor = {
    /**
     * the position of the declaration in its list
     */
    decl: number;
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
 * @param {BlockDeclarations} list
 * @param {[number[], number[]]} familyLanes
 * @return {{ lanes: [RadiusDeclarationDescriptor[], RadiusDeclarationDescriptor[]], radiusDescriptors: RadiusDeclarationDescriptor[] } | null}
 */
export declare function partitionLanes(list: BlockDeclarations, familyLanes: [number[], number[]]): {
    lanes: [RadiusDeclarationDescriptor[], RadiusDeclarationDescriptor[]];
    radiusDescriptors: RadiusDeclarationDescriptor[];
} | null;
//# sourceMappingURL=radiusDescriptors.d.ts.map