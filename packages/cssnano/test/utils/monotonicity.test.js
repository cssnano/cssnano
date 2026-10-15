import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { knownBrowsers } from '../../script/utils/knownBrowsers.js';
import { featureKeys } from '../../src/utils/featureKeys.js';
import { supportsAll } from '../../src/utils/browserSupport.js';
import { anyAffected } from '../../src/utils/browserBugs.js';
import bugs from '../../src/utils/data/bugs.json' with { type: 'json' };

const known = knownBrowsers();

// The randomized subset/superset sweep lives in perf/utils/monotonicity.js.
// These tests check the same invariant in linear time: a set's answer is the
// conjunction (supportsAll) or disjunction (anyAffected) of its members'.
describe('target monotonicity', () => {
  test('a set made of browsers that each support a feature supports it', () => {
    for (const feature of featureKeys) {
      const supporting = known.filter((entry) => supportsAll([entry], feature));
      // An empty set has no member to check, and supportsAll([]) is false by design.
      if (supporting.length === 0) continue;
      assert.equal(supportsAll(supporting, feature), true, feature);
    }
  });

  test('adding a browser that lacks a feature makes a supporting set lose it', () => {
    for (const feature of featureKeys) {
      const supporting = known.filter((entry) => supportsAll([entry], feature));
      const lacking = known.find((entry) => !supportsAll([entry], feature));
      if (lacking === undefined) continue;
      assert.equal(
        supportsAll([...supporting, lacking], feature),
        false,
        feature
      );
    }
  });

  test('a set made of browsers that the bug does not affect is not affected', () => {
    for (const bug of Object.keys(bugs)) {
      const unaffected = known.filter((entry) => !anyAffected([entry], bug));
      // An empty set has no member to check, and anyAffected([]) is true by design.
      if (unaffected.length === 0) continue;
      assert.equal(anyAffected(unaffected, bug), false, bug);
    }
  });

  test('adding a browser that the bug affects makes an unaffected set affected', () => {
    for (const bug of Object.keys(bugs)) {
      const unaffected = known.filter((entry) => !anyAffected([entry], bug));
      const affected = known.find((entry) => anyAffected([entry], bug));
      if (affected === undefined) continue;
      assert.equal(anyAffected([...unaffected, affected], bug), true, bug);
    }
  });
});
