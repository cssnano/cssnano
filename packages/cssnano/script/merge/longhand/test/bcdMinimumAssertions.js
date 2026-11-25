import assert from 'node:assert/strict';
import browserslist from 'browserslist';
import { isShippedRelease } from '../lib/bcdSupport.js';

/**
 * Invariants of committed minimum browser versions. Each takes a list of
 * minimums records, a browserslist name to the first version that supports
 * the feature.
 *
 * @typedef {Record<string, string>} Minimums
 */

/**
 * Every browser a minimums record names is one browserslist knows.
 *
 * @param {Minimums[]} records
 * @return {void}
 */
export function assertKnownBrowsers(records) {
  const known = new Set(Object.keys(browserslist.data));
  for (const minimums of records) {
    assert.deepEqual(
      Object.keys(minimums).filter((name) => !known.has(name)),
      []
    );
  }
}

/**
 * Every minimum is a plain dotted version, such as `15.4`.
 *
 * @param {Minimums[]} records
 * @return {void}
 */
export function assertPlainVersions(records) {
  for (const minimums of records) {
    for (const version of Object.values(minimums)) {
      assert.match(version, /^\d+(?:\.\d+)*$/v);
    }
  }
}

/**
 * Every minimum is at or below a release browserslist has already shipped for
 * that engine.
 *
 * @param {Minimums[]} records
 * @return {void}
 */
export function assertShippedReleases(records) {
  for (const minimums of records) {
    for (const [name, version] of Object.entries(minimums)) {
      assert.ok(isShippedRelease(name, version), name);
    }
  }
}
