import { parseCornerRadius, parseRadiusShorthand } from '../validateRadius.js';
import type { Declaration, Rule } from 'postcss';
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
 * @param {Rule} rule
 * @param {Declaration[]} [declarations]
 */
export declare function reduceBorderRadius(rule: Rule, declarations?: Declaration[]): void;
//# sourceMappingURL=borderRadiusReducer.d.ts.map