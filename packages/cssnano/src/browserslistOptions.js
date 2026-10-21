import {
  assertValid,
  isAbsent,
  isBoolean,
  isNonEmptyString,
  isQuery,
  isStats,
} from './optionGuards.js';

/** @import {Guard} from './optionGuards.js' */

/**
 * The browser targets, which every target-reading plugin shares. Each key
 * matches browserslist's option of the same name, except query, which is its
 * positional queries argument. An unset path is the PostCSS from.
 */
/** @type {Readonly<Record<string, Guard>>} */
const browserslistOptions = Object.freeze({
  query: {
    isValid: isQuery,
    expected: 'a non-empty string or a non-empty array of non-empty strings',
  },
  env: { isValid: isNonEmptyString, expected: 'a non-empty string' },
  stats: { isValid: isStats, expected: 'a non-empty string or a stats object' },
  path: { isValid: isNonEmptyString, expected: 'a non-empty string' },
  config: { isValid: isNonEmptyString, expected: 'a non-empty string' },
  ignoreUnknownVersions: { isValid: isBoolean, expected: 'a boolean' },
  mobileToDesktop: { isValid: isBoolean, expected: 'a boolean' },
  throwOnMissing: { isValid: isBoolean, expected: 'a boolean' },
});

/**
 * Browserslist options that cssnano refuses. Forwarding one would change what a
 * project config may load, so a user who writes one gets the reason.
 * @type {Readonly<Record<string, string>>}
 */
const refusedBrowserslistOptions = Object.freeze({
  dangerousExtend: 'it would let a browserslist config extend any package.',
});

/**
 * An unknown browserslist key throws rather than being reported, because
 * ignoring it would change the browser targets that the user asked for.
 * @param {Record<string, unknown>} browserslist
 * @returns {Record<string, unknown>}
 */
export function validateBrowserslist(browserslist) {
  /** @type {Record<string, unknown>} */
  const known = {};
  for (const [key, value] of Object.entries(browserslist)) {
    if (isAbsent(value)) continue;
    if (Object.hasOwn(refusedBrowserslistOptions, key)) {
      throw new TypeError(
        `Option "browserslist.${key}" is not supported, because ${refusedBrowserslistOptions[key]}`
      );
    }
    if (!Object.hasOwn(browserslistOptions, key)) {
      throw new TypeError(`"${key}" in browserslist is not an option.`);
    }
    assertValid(browserslistOptions[key], value, `browserslist.${key}`);
    known[key] = value;
  }
  return known;
}
