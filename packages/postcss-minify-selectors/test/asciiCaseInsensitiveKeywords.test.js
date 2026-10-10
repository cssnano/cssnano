import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeList } from '../src/lib/selectorScanner.js';

// Keywords match ASCII-case-insensitively (CSS Syntax 3), so U+212A KELVIN SIGN
// must not fold to `k` the way String#toLowerCase does.

test('does not treat a pseudo-class named with a Kelvin sign as the :marker pseudo-element so its descendant combinator is normalized', () => {
  assert.equal(
    normalizeList('a:mar\\212A er  b', false, false),
    'a:mar\\212A er b'
  );
});

test('keeps the descendant combinator spelling after the real :marker pseudo-element', () => {
  assert.equal(normalizeList('a:marker  b', false, false), 'a:marker  b');
});

test('matches an ASCII-uppercase pseudo-element name case-insensitively', () => {
  assert.equal(normalizeList('a:MARKER  b', false, false), 'a:MARKER  b');
});
