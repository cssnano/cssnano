import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import browserslist from 'browserslist';
import { knownBrowsers } from '../../script/utils/knownBrowsers.js';
import {
  anyAffected,
  browsersAffectedBy,
} from '../../src/utils/browserBugs.js';

const bugs = JSON.parse(
  readFileSync(
    new URL('../../src/utils/data/bugs.json', import.meta.url),
    'utf8'
  )
);

describe('anyAffected', () => {
  test('is true when a target has the transparent click bug', () => {
    assert.equal(
      anyAffected(['chrome 150', 'ie 8'], 'transparent-click-ie8-9'),
      true
    );
  });

  test('is false when no target has the transparent click bug', () => {
    assert.equal(
      anyAffected(['chrome 150', 'ie 11'], 'transparent-click-ie8-9'),
      false
    );
  });

  test('is true for an ie 10 target with the media all keyword bug', () => {
    assert.equal(anyAffected(['ie 10'], 'media-all-ie10-11'), true);
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
    assert.throws(() => anyAffected(['ie 8'], 'no-such-bug'), RangeError);
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

  test('ie zero unit retention covers every ie version that browserslist can emit', () => {
    // The old check matched any "ie " target; the bug list must stay as wide.
    for (const target of browserslist('ie > 0')) {
      assert.equal(
        anyAffected([target], 'ie-zero-unit-retention'),
        true,
        target
      );
    }
  });

  test('every bug cites an https source', () => {
    for (const [key, bug] of Object.entries(bugs)) {
      assert.ok(bug.source?.startsWith('https://'), key);
    }
  });
});

describe('browsersAffectedBy', () => {
  test('lists the browser entries that the bug affects, in bugs.json order', () => {
    assert.deepEqual(
      [...browsersAffectedBy('transparent-click-ie8-9')],
      ['ie 8', 'ie 9']
    );
  });

  test('returns the same set on every call, so a caller allocates nothing', () => {
    assert.equal(
      browsersAffectedBy('transparent-click-ie8-9'),
      browsersAffectedBy('transparent-click-ie8-9')
    );
  });

  test('returns a frozen list, so a reporter cannot change the bug data for other files', () => {
    assert.equal(
      Object.isFrozen(browsersAffectedBy('transparent-click-ie8-9')),
      true
    );
  });

  test('throws a RangeError for a bug key that is not in the data', () => {
    assert.throws(() => browsersAffectedBy('no-such-bug'), RangeError);
  });
});
