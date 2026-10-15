import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { knownBrowsers } from '../../script/utils/knownBrowsers.js';
import { random } from '../../../../util/fuzzRng.js';
import { featureKeys } from '../../src/utils/featureKeys.js';
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

describe('target sets are monotonic', () => {
  test('a feature supported by every target of B is supported by every non-empty subset A', () => {
    const rng = random(20260515);
    for (let round = 0; round < 1000; round += 1) {
      const size = 1 + rng.int(12);
      const superset = [];
      for (let index = 0; index < size; index += 1) {
        superset.push(rng.pick(known));
      }
      const subset = superset.filter(() => rng.chance(0.5));
      if (subset.length === 0) continue;
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
    const rng = random(20260516);
    for (let round = 0; round < 1000; round += 1) {
      const size = 1 + rng.int(12);
      const superset = [];
      for (let index = 0; index < size; index += 1) {
        superset.push(rng.pick(known));
      }
      const subset = superset.filter(() => rng.chance(0.5));
      if (subset.length === 0) continue;
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
