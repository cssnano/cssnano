import isRecord from './utils/isRecord.js';

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
export function assertValid({ isValid, expected }, value, name) {
  if (!isValid(value)) {
    throw new TypeError(`Option "${name}" must be ${expected}.`);
  }
}

/**
 * Null and undefined both mean that the key is unset, so validation skips them.
 * @param {unknown} value
 * @returns {value is null | undefined}
 */
export const isAbsent = (value) => value === undefined || value === null;

/** @param {unknown} value @returns {value is string} */
const isString = (value) => typeof value === 'string';

/** @param {unknown} value @returns {value is string} */
export const isNonEmptyString = (value) =>
  isString(value) && value.trim() !== '';

/** @param {unknown} value @returns {value is boolean} */
export const isBoolean = (value) => typeof value === 'boolean';

/** @param {unknown} value @returns {value is string[]} */
export const isStringList = (value) =>
  Array.isArray(value) && value.every((item) => isString(item));

/**
 * A query must name at least one browser, because an empty one matches none
 * and turns off every target-dependent optimization.
 * @param {unknown} value
 * @returns {value is string | string[]}
 */
export const isQuery = (value) =>
  isNonEmptyString(value) ||
  (Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => isNonEmptyString(item)));

/**
 * @param {unknown} value
 * @returns {value is Record<string, Record<string, number>>}
 */
const isUsageByBrowser = (value) =>
  isRecord(value) &&
  Object.values(value).every(
    (entry) =>
      isRecord(entry) &&
      Object.values(entry).every((count) => typeof count === 'number')
  );

/**
 * A Can I Use export wraps the usage in dataByBrowser, which browserslist reads.
 * @param {unknown} value
 * @returns {boolean}
 */
export const isStats = (value) =>
  isNonEmptyString(value) ||
  isUsageByBrowser(value) ||
  (isRecord(value) && isUsageByBrowser(value.dataByBrowser));

/**
 * @param {unknown} value
 * @returns {boolean} whether the value is a stage descriptor, which has a build function
 */
const isStageDescriptor = (value) =>
  isRecord(value) && typeof value.build === 'function';

/**
 * Whether a list has the entries that validateOptions reads: a plugin creator
 * or a stage descriptor, the option name and the settings with their option
 * keys. A copy of cssnano with another entry shape is rejected here, not
 * crashed on later.
 *
 * @param {unknown} value
 * @returns {value is readonly PluginEntry[]}
 */
export function isPluginEntries(value) {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        Array.isArray(entry) &&
        entry.length === 3 &&
        (typeof entry[0] === 'function' || isStageDescriptor(entry[0])) &&
        isString(entry[1]) &&
        isRecord(entry[2]) &&
        isStringList(entry[2].optionKeys)
    )
  );
}
