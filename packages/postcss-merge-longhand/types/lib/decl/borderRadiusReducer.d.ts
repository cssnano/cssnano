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
 * @param {Container} rule
 * @param {Declaration[]} [declarations]
 * @param {[Declaration[], Declaration[]]} [lanes]
 */
export declare function reduceBorderRadius(rule: Container, declarations?: Declaration[], lanes?: [Declaration[], Declaration[]]): void;
//# sourceMappingURL=borderRadiusReducer.d.ts.map