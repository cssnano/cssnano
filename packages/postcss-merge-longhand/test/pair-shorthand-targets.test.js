import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { supportedPairShorthands } from '../src/lib/targetSupport.js';

describe('supportedPairShorthands', () => {
  test('omits a gated shorthand that has no minimums instead of throwing', () => {
    assert.equal(
      supportedPairShorthands(['chrome 120'], {}).has('overscroll-behavior'),
      false
    );
  });

  test('keeps a gated shorthand that every target reaches', () => {
    assert.equal(
      supportedPairShorthands(['chrome 120'], { gap: { chrome: '57' } }).has(
        'gap'
      ),
      true
    );
  });

  test('keeps an ungated family whatever the minimums say', () => {
    assert.equal(
      supportedPairShorthands(['chrome 120'], {}).has('column-rule'),
      true
    );
  });
});
