import type { FeatureKey } from './featureKeys.js';
export type Stats = Record<string, Record<string, string>>;
/**
 * Whether every target supports the feature, judged by the installed
 * caniuse-lite. An entry that caniuse-lite does not list counts as
 * unsupported, so it never lets a feature through; an empty list is
 * unsupported too. Plugins that keep fallbacks, such as merge-longhand,
 * instead assume an unknown engine may understand a property; both choices
 * keep the output safe for that engine.
 * Answers are cached by the identity of the list, so the list must not change
 * after the first call.
 * @param {readonly string[]} targets browserslist entries such as "safari 26.5"
 * @param {FeatureKey} feature
 * @return {boolean}
 */
export declare function supportsAll(targets: readonly string[], feature: FeatureKey): boolean;
/**
 * Whether there are targets and every one passes the test. An empty list
 * means the targets are unknown, so no target can vouch for anything.
 * @param {readonly string[]} targets browserslist entries such as "ie 8"
 * @param {(entry: string) => boolean} test
 * @return {boolean}
 */
export declare function everyTarget(targets: readonly string[], test: (entry: string) => boolean): boolean;
//# sourceMappingURL=browserSupport.d.ts.map