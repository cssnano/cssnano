import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import browserslist from 'browserslist';
import caniuseApi from 'caniuse-api';
import { feature, features } from 'caniuse-lite';
import { knownBrowsers } from '../../script/utils/knownBrowsers.js';
import { random } from '../../../../util/fuzzRng.js';
import { featureKeys } from '../../src/utils/featureKeys.js';
import { supportsAll } from '../../src/utils/browserSupport.js';

const known = knownBrowsers();

// caniuse-api counts `y x` (needs a vendor prefix) as supported. supportsAll
// does not, so the oracle expects false for any target with that status.
/**
 * @param {string} key
 * @param {string} entry
 * @return {boolean}
 */
function needsPrefix(key, entry) {
  const [name, version] = entry.split(' ');
  const status = feature(features[/** @type {keyof typeof features} */ (key)])
    .stats[name]?.[version];
  return status?.split(' ').includes('x') === true;
}

// Plugins pass browserslist's resolution, so the oracle expands each entry the
// same way. A range such as `android 4.4.3-4.4.4` also resolves to `android 4.4`.
/** @param {string} entry */
function resolved(entry) {
  return browserslist(entry, { ignoreUnknownVersions: true });
}

describe('supportsAll agrees with caniuse-api isSupported', () => {
  test('for every feature key and every known browser version', () => {
    for (const key of featureKeys) {
      for (const entry of known) {
        const targets = resolved(entry);
        const expected =
          !needsPrefix(key, entry) && caniuseApi.isSupported(key, targets);
        assert.equal(supportsAll(targets, key), expected, `${key} ${entry}`);
      }
    }
  });

  test('for random target sets of one to eight known versions', () => {
    const rng = random(20260514);
    for (let round = 0; round < 2000; round += 1) {
      const size = 1 + rng.int(8);
      const entries = [];
      for (let index = 0; index < size; index += 1) {
        entries.push(rng.pick(known));
      }
      const targets = browserslist(entries, { ignoreUnknownVersions: true });
      const key = rng.pick(featureKeys);
      const expected =
        !targets.some((target) => needsPrefix(key, target)) &&
        caniuseApi.isSupported(key, targets);
      assert.equal(
        supportsAll(targets, key),
        expected,
        `${key} ${targets.join(', ')}`
      );
    }
  });
});
