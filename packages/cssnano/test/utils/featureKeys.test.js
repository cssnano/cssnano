import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { features as caniuseFeatures } from 'caniuse-lite';
import { packedFeatures } from '../../src/utils/featureKeys.js';
import { featureKeys } from './_featureKeys.js';

describe('feature keys', () => {
  test('every key is a caniuse-lite feature', () => {
    for (const key of featureKeys) {
      assert.ok(Object.hasOwn(caniuseFeatures, key), key);
    }
  });

  test('each separately imported feature holds data equal to the caniuse-lite index', () => {
    for (const key of featureKeys) {
      assert.deepEqual(packedFeatures[key], caniuseFeatures[key], key);
    }
  });

  test('keys are sorted', () => {
    assert.deepEqual([...featureKeys], [...featureKeys].toSorted());
  });
});
