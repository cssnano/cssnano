import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { lookup, supportOf } from '../lib/bcdSupport.js';

describe('supportOf', () => {
  test('returns the per-browser statements of the compatibility record', () => {
    const support = { chrome: { version_added: '1' } };
    assert.equal(supportOf({ __compat: { support } }), support);
  });

  test('returns undefined for an entry without a compatibility record', () => {
    assert.equal(supportOf({}), undefined);
    assert.equal(supportOf(undefined), undefined);
  });
});

describe('lookup', () => {
  test('follows a dotted path', () => {
    const entry = { __compat: { support: {} } };
    assert.equal(
      lookup({ css: { types: { time: entry } } }, 'css.types.time'),
      entry
    );
  });

  test('returns undefined when a path segment is missing', () => {
    assert.equal(lookup({ css: {} }, 'css.types.time'), undefined);
  });
});
