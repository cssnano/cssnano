import assert from 'node:assert/strict';
import { test } from 'node:test';
import { knownBrowsers } from '../../script/utils/knownBrowsers.js';
import {
  featuresSupportedByAll,
  supportedPairShorthands,
  supportsPlaceShorthands,
} from '../../src/plugins/postcss-merge-longhand/lib/targetSupport.js';

const known = knownBrowsers();

/** Every release of each engine, then every known release together. */
const lists = [
  ...Map.groupBy(known, (entry) => entry.split(' ')[0]).values(),
  known,
];

/**
 * @param {readonly string[]} list
 * @param {(entry: readonly string[]) => ReadonlySet<string>} supported
 * @return {Set<string>} what every target of the list supports on its own
 */
function supportedByEachTarget(list, supported) {
  let common = new Set(supported([list[0]]));
  for (const entry of list) {
    common = common.intersection(supported([entry]));
  }
  return common;
}

// The randomized subset sweep lives in perf/postcss-merge-longhand/targetSupportSweep.js.
test('a list supports a feature exactly when each of its targets does on its own', () => {
  for (const list of lists) {
    assert.deepEqual(
      featuresSupportedByAll(list),
      supportedByEachTarget(list, featuresSupportedByAll),
      list[0]
    );
  }
});

test('a list supports a pair shorthand exactly when each of its targets does on its own', () => {
  for (const list of lists) {
    assert.deepEqual(
      supportedPairShorthands(list),
      supportedByEachTarget(list, supportedPairShorthands),
      list[0]
    );
  }
});

test('a list supports the place-* shorthands exactly when each of its targets does on its own', () => {
  for (const list of lists) {
    assert.equal(
      supportsPlaceShorthands(list),
      list.every((entry) => supportsPlaceShorthands([entry])),
      list[0]
    );
  }
});
