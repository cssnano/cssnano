import type { FeatureKey } from './featureKeys.js';
export type Stats = Record<string, Record<string, string>>;
/**
 * An empty target list means the targets are unknown, as when a query
 * matches no browser. Every support and bug check applies this one policy, so
 * unknown targets never enable a transform that some browser may break on.
 * @param {readonly string[]} targets browserslist entries such as "safari 26.5"
 * @return {boolean}
 */
export declare function targetsAreUnknown(targets: readonly string[]): boolean;
/**
 * Whether every target supports the feature, judged by the installed
 * caniuse-lite. A target it does not list, or an empty list, counts as
 * unsupported, so unknown browsers never let a feature through. The list must
 * not change after the first call, because answers are cached by its identity.
 * @param {readonly string[]} targets browserslist entries such as "safari 26.5"
 * @param {FeatureKey} feature
 * @return {boolean}
 */
export declare function supportsAll(targets: readonly string[], feature: FeatureKey): boolean;
//# sourceMappingURL=browserSupport.d.ts.map