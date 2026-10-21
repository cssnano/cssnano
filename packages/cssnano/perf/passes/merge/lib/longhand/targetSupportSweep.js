import assert from 'node:assert/strict';
import { test } from 'node:test';
import { random } from '../../../../../../../util/fuzzRng.js';
import { knownBrowsers } from '../../../../../script/utils/knownBrowsers.js';
import {
  featuresSupportedByAll,
  supportedPairShorthands,
  supportsPlaceShorthands,
} from '../../../../../src/passes/merge/lib/longhand/targetSupport.js';

/**
 * A seeded sweep of random target lists, too slow for the regular suite:
 * summarizing a list by the oldest release of each engine must give the
 * answer that checking every target on its own gives.
 */

const known = knownBrowsers();
const rounds = 5000;

/**
 * @param {readonly string[]} list
 * @param {(list: readonly string[]) => ReadonlySet<string>} supported
 */
function supportedByEachTarget(list, supported) {
  let common = new Set(supported([list[0]]));
  for (const entry of list) {
    common = common.intersection(supported([entry]));
  }
  return common;
}

test('a random list supports exactly what each of its targets supports on its own', () => {
  const rng = random(20261017);
  for (let round = 0; round < rounds; round += 1) {
    const size = 1 + rng.int(40);
    const list = Array.from({ length: size }, () => rng.pick(known));
    const label = list.join(', ');
    assert.deepEqual(
      featuresSupportedByAll(list),
      supportedByEachTarget(list, featuresSupportedByAll),
      label
    );
    assert.deepEqual(
      supportedPairShorthands(list),
      supportedByEachTarget(list, supportedPairShorthands),
      label
    );
    assert.equal(
      supportsPlaceShorthands(list),
      list.every((entry) => supportsPlaceShorthands([entry])),
      label
    );
  }
});
