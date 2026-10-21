export declare const longstandingUnits: Set<string>;
export declare const longstandingFunctions: Set<string>;
/**
 * The longstanding syntax that a browser below the floor may lack. Every
 * target at or above the floor parses it, so the plugin grants it then.
 *
 * @type {ReadonlySet<string>}
 */
export declare const longstandingFeatures: ReadonlySet<string>;
/**
 * Every feature but a ubiquitous function such as `rgba()`,
 * which stylesheets use without fallbacks.
 *
 * @param {string} feature
 * @return {boolean} whether a merged shorthand would be rejected by a browser
 * that lacks the feature, taking the other sides with it
 */
export declare function blocksMerge(feature: string): boolean;
/**
 * @param {string} value
 * @return {Set<string>} the features a browser must support to parse the value
 */
export declare function supportDependenciesIn(value: string): Set<string>;
/**
 * Values repeat within a file, not across files: drop the memo so a
 * long-running process does not keep every value it has seen.
 *
 * @return {void}
 */
export declare function clearSupportCache(): void;
//# sourceMappingURL=syntaxFeatures.d.ts.map