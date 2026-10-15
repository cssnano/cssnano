import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { boxProperties } from '../../src/plugins/postcss-merge-longhand/lib/decl/boxGroups.js';
import { pairFamilies } from '../../src/plugins/postcss-merge-longhand/lib/decl/pairForms.js';
import {
  BoxSupport,
  featuresSupportedByAll,
  supportedPairShorthands,
  supportsPlaceShorthands,
} from '../../src/plugins/postcss-merge-longhand/lib/targetSupport.js';

// A query that matches no browser leaves the targets unknown. Each check
// answers as it would for an engine the compatibility data does not cover.

/**
 * @param {string} name
 * @return {import('../../src/plugins/postcss-merge-longhand/lib/decl/boxGroups.js').BoxProperty}
 */
function property(name) {
  return /** @type {import('../../src/plugins/postcss-merge-longhand/lib/decl/boxGroups.js').BoxProperty} */ (
    boxProperties.get(name)
  );
}

describe('merge-longhand support for an empty target list', () => {
  test('does not support the place-* shorthands', () => {
    assert.equal(supportsPlaceShorthands([]), false);
  });

  test('supports only the pair shorthands that need no support check', () => {
    const ungated = pairFamilies
      .filter(({ supportKey }) => supportKey === null)
      .map(({ shorthand }) => shorthand);
    assert.deepEqual(
      [...supportedPairShorthands([])].toSorted(),
      ungated.toSorted()
    );
  });

  test('supports no newer syntax, so every fallback is kept', () => {
    assert.equal(featuresSupportedByAll([]).size, 0);
  });

  test('does not support a flow-relative box property', () => {
    assert.equal(new BoxSupport([]).supportsAll('margin-block'), false);
  });

  test('supports margin, because every engine parses CSS 1', () => {
    assert.equal(new BoxSupport([]).supportsAll('margin'), true);
  });

  test('does not let a flow-relative property override a physical one an unknown engine may understand', () => {
    assert.equal(
      new BoxSupport([]).understandsWherever(
        property('margin-top'),
        property('margin-block-start')
      ),
      false
    );
  });

  test('lets a CSS 2 property override a flow-relative one', () => {
    assert.equal(
      new BoxSupport([]).understandsWherever(
        property('margin-block-start'),
        property('margin-top')
      ),
      true
    );
  });
});
