export type VersionParts = import('#utils/versions').VersionParts;
export type BoxTarget = {
    /**
     * - a browserslist entry such as "safari 10.1"
     */
    entry: string;
    /**
     * - the browserslist name, such as "safari"
     */
    engine: string;
    /**
     * - whether the box data covers the engine
     */
    covered: boolean;
    /**
     * - whether the target is TP
     */
    preview: boolean;
    /**
     * - the oldest version, or
     * undefined when it is neither dotted nor a range of dotted versions
     */
    lowest: VersionParts | undefined;
};
/**
 * Whether every engine parses the property, as for the CSS 1 and CSS 2 box
 * properties. Only these are safe for targets that are unknown.
 *
 * @param {string} property - a property of the box groups
 * @return {boolean}
 */
export declare function isUniversalBoxProperty(property: string): boolean;
export type PropertySupport = {
    /**
     * - whether every distinct target understands it
     */
    all: boolean;
    /**
     * - the targets that understand it
     */
    understanding: ReadonlySet<string>;
    /**
     * - the targets that may
     * understand it: those that understand it, and those the data does not cover.
     * The data says nothing about some engines, such as UC Browser, so they may
     * understand any property. This is safer to assume than to deny for a fallback.
     */
    mayUnderstanding: ReadonlySet<string>;
};
/**
 * @typedef {object} PropertySupport
 * @property {boolean} all - whether every distinct target understands it
 * @property {ReadonlySet<string>} understanding - the targets that understand it
 * @property {ReadonlySet<string>} mayUnderstanding - the targets that may
 * understand it: those that understand it, and those the data does not cover.
 * The data says nothing about some engines, such as UC Browser, so they may
 * understand any property. This is safer to assume than to deny for a fallback.
 */
/**
 * Works out each box property's support over the distinct targets, in one pass
 * per property. Built once per targetSupportOf call, so queries are lookups.
 *
 * @param {readonly string[]} browsers - browserslist entries such as "safari 10.1"
 * @return {ReadonlyMap<string, PropertySupport>}
 */
export declare function summarizeBoxProperties(browsers: readonly string[]): ReadonlyMap<string, PropertySupport>;
//# sourceMappingURL=boxSupportTable.d.ts.map