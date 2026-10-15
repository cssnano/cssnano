import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { supportsAll } from '../../src/utils/browserSupport.js';
import { pseudoElements } from '../../src/plugins/postcss-merge-rules/lib/pseudoSupport.js';

describe('pseudoElements support keys', () => {
  test('every pseudo maps to a feature key that the support data knows', () => {
    for (const [pseudo, feature] of Object.entries(pseudoElements)) {
      // supportsAll throws a RangeError for a key the data does not define.
      assert.doesNotThrow(() => supportsAll(['chrome 150'], feature), pseudo);
    }
  });
});
