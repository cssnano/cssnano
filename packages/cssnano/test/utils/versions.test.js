import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { browserName, versionSeparator } from '../../src/utils/versions.js';

/** @param {string} entry */
function parts(entry) {
  const separator = versionSeparator(entry);
  return [entry.slice(0, separator), entry.slice(separator + 1)];
}

describe('versionSeparator', () => {
  test('splits every entry that names a version into parts that rejoin it', () => {
    for (const entry of ['safari 26.5', 'ios_saf 18.5-18.7', 'safari TP']) {
      assert.equal(parts(entry).join(' '), entry);
    }
  });

  test('splits at the first space, so the version may hold a range', () => {
    assert.deepEqual(parts('ios_saf 18.5-18.7'), ['ios_saf', '18.5-18.7']);
  });

  test('reads an entry without a version as a browser with an empty version', () => {
    assert.deepEqual(parts('chrome'), ['chrome', '']);
  });
});

describe('browserName', () => {
  test('is the part before the version separator', () => {
    for (const entry of ['safari 26.5', 'safari TP', 'chrome']) {
      assert.equal(browserName(entry), parts(entry)[0]);
    }
  });
});
