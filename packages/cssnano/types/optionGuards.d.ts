import type { PluginEntry } from './presets/configurePlugins.js';
export type Guard = {
    isValid: (value: unknown) => boolean;
    expected: string;
};
/** @import {PluginEntry} from './presets/configurePlugins.js' */
/**
 * @typedef {{isValid: (value: unknown) => boolean, expected: string}} Guard
 */
/**
 * A known key whose value fails its guard throws, because cssnano cannot tell
 * what was meant.
 * @param {Guard} guard
 * @param {unknown} value
 * @param {string} name the option as the user wrote it, such as "browserslist.env"
 */
export declare function assertValid({ isValid, expected }: Guard, value: unknown, name: string): void;
/**
 * Null and undefined both mean that the key is unset, so validation skips them.
 * @param {unknown} value
 * @returns {value is null | undefined}
 */
export declare const isAbsent: (value: unknown) => value is null | undefined;
/** @param {unknown} value @returns {value is string} */
export declare const isNonEmptyString: (value: unknown) => value is string;
/** @param {unknown} value @returns {value is boolean} */
export declare const isBoolean: (value: unknown) => value is boolean;
/** @param {unknown} value @returns {value is string[]} */
export declare const isStringList: (value: unknown) => value is string[];
/**
 * A query must name at least one browser, because an empty one matches none
 * and turns off every target-dependent optimization.
 * @param {unknown} value
 * @returns {value is string | string[]}
 */
export declare const isQuery: (value: unknown) => value is string | string[];
/**
 * A Can I Use export wraps the usage in dataByBrowser, which browserslist reads.
 * @param {unknown} value
 * @returns {boolean}
 */
export declare const isStats: (value: unknown) => boolean;
/**
 * Whether a list has the entries that validateOptions reads: a plugin creator
 * or a stage entry, the option name and the settings with their option
 * keys. A copy of cssnano with another entry shape is rejected here, not
 * crashed on later.
 *
 * @param {unknown} value
 * @returns {value is readonly PluginEntry[]}
 */
export declare function isPluginEntries(value: unknown): value is readonly PluginEntry[];
//# sourceMappingURL=optionGuards.d.ts.map