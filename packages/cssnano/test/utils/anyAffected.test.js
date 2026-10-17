import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { knownBrowsers } from '../../script/utils/knownBrowsers.js';
import { anyAffected } from '../../src/utils/browserBugs.js';

const bugs = JSON.parse(
  readFileSync(
    new URL('../../src/utils/data/bugs.json', import.meta.url),
    'utf8'
  )
);

describe('anyAffected', () => {
  test('is true when a target has the media all keyword bug', () => {
    assert.equal(anyAffected(['chrome 150', 'ie 11'], 'media-all-ie11'), true);
  });

  test('is false when no target has the media all keyword bug', () => {
    assert.equal(anyAffected(['chrome 150'], 'media-all-ie11'), false);
  });

  test('is true for every bug when the target list is empty, because unknown targets may have any bug', () => {
    for (const bug of Object.keys(bugs)) {
      assert.equal(anyAffected([], bug), true, bug);
    }
  });

  test('is true for an edge target that lowercases the unicode-range prefix badly', () => {
    assert.equal(anyAffected(['edge 15'], 'unicode-range-lowercase-u'), true);
  });

  test('is false for a modern edge target and the unicode-range bug', () => {
    assert.equal(anyAffected(['edge 16'], 'unicode-range-lowercase-u'), false);
  });

  test('throws a RangeError for a bug key that is not in the data', () => {
    assert.throws(() => anyAffected(['ie 11'], 'no-such-bug'), RangeError);
  });
});

describe('browser bug data', () => {
  test('every bug lists only browser entries that caniuse-lite lists', () => {
    const known = new Set(knownBrowsers());
    for (const [key, bug] of Object.entries(bugs)) {
      for (const entry of bug.browsers) {
        assert.ok(known.has(entry), `${key}: ${entry}`);
      }
    }
  });

  test('ie zero unit retention covers ie 11, the oldest IE that cssnano supports', () => {
    assert.equal(anyAffected(['ie 11'], 'ie-zero-unit-retention'), true);
  });

  // IE Mobile 11 runs the same Trident engine as IE 11.
  for (const bug of Object.keys(bugs)) {
    test(`${bug} affects ie_mob 11, which shares the engine of ie 11`, () => {
      assert.equal(anyAffected(['ie_mob 11'], bug), true);
    });
  }

  test('every bug cites an https source', () => {
    for (const [key, bug] of Object.entries(bugs)) {
      assert.ok(bug.source?.startsWith('https://'), key);
    }
  });
});
