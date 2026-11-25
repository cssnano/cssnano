import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { knownBrowsers } from '../../script/utils/knownBrowsers.js';
import { random } from '../../../../util/fuzzRng.js';
import { featureKeys } from '../../test/utils/_featureKeys.js';
import { supportsAll } from '../../src/utils/browserSupport.js';
import { anyAffected } from '../../src/utils/browserBugs.js';

const known = knownBrowsers();
const bugs = JSON.parse(
  readFileSync(
    new URL('../../src/utils/data/bugs.json', import.meta.url),
    'utf8'
  )
);
const bugKeys = Object.keys(bugs);

/**
 * Random target sets with a non-empty subset of each. A round whose subset
 * comes out empty is skipped, not redrawn, so each seed keeps its sequence.
 *
 * @param {number} seed
 * @return {Generator<{ superset: string[], subset: string[] }>}
 */
function* targetSets(seed) {
  const rng = random(seed);
  for (let round = 0; round < 1000; round += 1) {
    const size = 1 + rng.int(12);
    const superset = [];
    for (let index = 0; index < size; index += 1) {
      superset.push(rng.pick(known));
    }
    const subset = superset.filter(() => rng.chance(0.5));
    if (subset.length > 0) yield { superset, subset };
  }
}

describe('target sets are monotonic', () => {
  test('a feature supported by every target of B is supported by every non-empty subset A', () => {
    for (const { superset, subset } of targetSets(20260515)) {
      for (const feature of featureKeys) {
        if (supportsAll(superset, feature)) {
          assert.ok(
            supportsAll(subset, feature),
            `${feature} ${subset.join(', ')}`
          );
        }
      }
    }
  });

  test('a bug that affects a non-empty subset A also affects its superset B', () => {
    for (const { superset, subset } of targetSets(20260516)) {
      for (const bug of bugKeys) {
        if (anyAffected(subset, bug)) {
          assert.ok(
            anyAffected(superset, bug),
            `${bug} ${superset.join(', ')}`
          );
        }
      }
    }
  });
});
