/**
 * Reads @mdn/browser-compat-data (BCD): the browser name mapping, the
 * support records and the rule for what counts as standard, unprefixed,
 * unflagged support.
 */
import { compareVersions } from '../../src/lib/compareVersions.js';

/**
 * @typedef {{
 *   version_added: string | boolean | null,
 *   version_removed?: string | boolean | null,
 *   flags?: unknown[],
 *   prefix?: string,
 *   alternative_name?: string,
 *   partial_implementation?: boolean,
 * }} SupportStatement
 * @typedef {{ __compat?: { support: Record<string, SupportStatement | SupportStatement[]> } }} CompatEntry
 * @typedef {{ css: { properties: Record<string, CompatEntry & Record<string, CompatEntry>> } }} CompatData
 */

/** BCD browser identifiers keyed to the browserslist names of the same engines. */
export const browserslistNames = new Map([
  ['chrome', 'chrome'],
  ['chrome_android', 'and_chr'],
  ['edge', 'edge'],
  ['firefox', 'firefox'],
  ['firefox_android', 'and_ff'],
  ['ie', 'ie'],
  ['opera', 'opera'],
  ['opera_android', 'op_mob'],
  ['safari', 'safari'],
  ['safari_ios', 'ios_saf'],
  ['samsunginternet_android', 'samsung'],
  ['webview_android', 'android'],
]);

export const plainVersion = /^\d+(?:\.\d+)*$/v;

/**
 * The per-browser support statements of a BCD entry.
 *
 * @param {CompatEntry | undefined} entry
 * @return {Record<string, SupportStatement | SupportStatement[]> | undefined}
 */
export function supportOf(entry) {
  // BCD names its compatibility record __compat.
  // eslint-disable-next-line no-underscore-dangle
  return entry?.__compat?.support;
}

/**
 * @param {unknown} root
 * @param {string} path - dotted keys
 * @return {CompatEntry | undefined}
 */
export function lookup(root, path) {
  let node = root;
  for (const key of path.split('.')) {
    node = /** @type {Record<string, unknown> | undefined} */ (node)?.[key];
  }
  return /** @type {CompatEntry | undefined} */ (node);
}

/**
 * The earliest version with standard support, or undefined. A ranged
 * version such as "≤79" only bounds support from above, so its bound is used.
 *
 * @param {SupportStatement | SupportStatement[]} support
 * @return {string | undefined}
 */
export function standardSupportSince(support) {
  /** @type {string | undefined} */
  let earliest;
  for (const statement of [support].flat()) {
    if (
      statement.flags ||
      statement.prefix ||
      statement.alternative_name ||
      statement.partial_implementation ||
      statement.version_removed ||
      typeof statement.version_added !== 'string'
    ) {
      continue;
    }
    const version = statement.version_added.replace(/^≤/v, '');
    if (!plainVersion.test(version)) continue;
    if (earliest === undefined || compareVersions(version, earliest) < 0) {
      earliest = version;
    }
  }
  return earliest;
}
