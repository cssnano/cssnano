import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { everyTarget } from '../../src/utils/browserSupport.js';

describe('everyTarget', () => {
  test('is true when every target passes the test', () => {
    assert.equal(
      everyTarget(['chrome 150', 'edge 150'], (entry) => entry !== 'ie 6'),
      true
    );
  });

  test('is false when one target fails the test', () => {
    assert.equal(
      everyTarget(['chrome 150', 'ie 6'], (entry) => entry !== 'ie 6'),
      false
    );
  });

  test('is false for an empty list, because the targets are unknown', () => {
    assert.equal(
      everyTarget([], () => true),
      false
    );
  });
});
