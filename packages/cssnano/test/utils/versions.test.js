import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  browserName,
  compareVersionParts,
  versionParts,
  versionSeparator,
} from '../../src/utils/versions.js';

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

describe('versionParts', () => {
  test('splits a dotted version into numbers', () => {
    assert.deepEqual(versionParts('14.5'), [14, 5]);
  });
});

describe('compareVersionParts', () => {
  test('orders an older version before a newer one', () => {
    assert.ok(compareVersionParts([14, 1], [14, 5]) < 0);
    assert.ok(compareVersionParts([14, 5], [14, 1]) > 0);
  });

  test('counts a missing part as zero, so 14 equals 14.0', () => {
    assert.equal(compareVersionParts([14], [14, 0]), 0);
  });

  test('orders multi-digit parts as numbers, so 10.1 follows 9.3', () => {
    assert.ok(compareVersionParts([10, 1], [9, 3]) > 0);
  });
});
