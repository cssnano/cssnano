import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  latestSupport,
  lookup,
  standardSupportSince,
  supportOf,
} from '../lib/bcdSupport.js';

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

const standard = (version) => ({ version_added: version });

describe('latestSupport', () => {
  test('returns the latest of the entries that each support', () => {
    const entries = [
      { __compat: { support: { chrome: standard('57') } } },
      { __compat: { support: { chrome: standard('66') } } },
    ];
    assert.equal(latestSupport(entries, 'chrome', standardSupportSince), '66');
  });

  test('has no answer when one entry lacks the support', () => {
    const entries = [
      { __compat: { support: { chrome: standard('57') } } },
      { __compat: { support: { chrome: standard('66') } } },
      undefined,
    ];
    assert.equal(
      latestSupport(entries, 'chrome', standardSupportSince),
      undefined
    );
  });
});
