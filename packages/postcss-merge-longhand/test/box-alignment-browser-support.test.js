import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';
import { supportsPlaceShorthands } from '../src/lib/targetSupport.js';

/**
 * @param {string} overrideBrowserslist
 */
function forTargets(overrideBrowserslist) {
  return processCSSFactory([plugin({ overrideBrowserslist })]);
}

describe('place-* synthesis gated on browserslist targets', () => {
  test(
    'merges align-items and justify-items into place-items when every target supports place-*',
    forTargets('chrome 120, safari 17, firefox 120').processCSS(
      'a{align-items:center;justify-items:start}',
      'a{place-items:center start}'
    )
  );

  test(
    'keeps longhands for Chrome 59 because it supports place-* but drops the whole shorthand for space-evenly',
    forTargets('chrome 59').passthroughCSS(
      'a{align-content:space-evenly;justify-content:center}'
    )
  );

  test(
    'merges space-evenly for Chrome 60 because it parses the keyword',
    forTargets('chrome 60').processCSS(
      'a{align-content:space-evenly;justify-content:center}',
      'a{place-content:space-evenly center}'
    )
  );

  test(
    'keeps longhands for Safari 10.1 because it predates place-* and would drop both axes',
    forTargets('safari 10.1').passthroughCSS(
      'a{align-items:center;justify-items:start}'
    )
  );

  test(
    'keeps longhands for legacy Edge 18 because it predates place-*',
    forTargets('edge 18').passthroughCSS(
      'a{align-self:center;justify-self:start}'
    )
  );

  test(
    'keeps place-items longhands for Firefox 52 because it predates place-content, which the gate also requires',
    forTargets('firefox 52').passthroughCSS(
      'a{align-items:center;justify-items:start}'
    )
  );

  test(
    'keeps longhands for Opera Mini because there is no compatibility data to prove place-* support',
    forTargets('op_mini all').passthroughCSS(
      'a{align-content:center;justify-content:start}'
    )
  );

  test(
    'keeps an overriding longhand separate from place-items for old targets because they would lose it with the shorthand',
    forTargets('safari 10.1').passthroughCSS(
      'a{place-items:center;justify-items:start}'
    )
  );

  test(
    'still folds an authored place-content for old targets because the shorthand is already present',
    forTargets('safari 10.1').processCSS(
      'a{place-content:center center}',
      'a{place-content:center}'
    )
  );
});

describe('supportsPlaceShorthands', () => {
  test('accepts browsers at the minimum version', () => {
    assert.equal(supportsPlaceShorthands(['chrome 60', 'safari 11']), true);
  });

  test('rejects Chrome 59 because it lacks space-evenly parsing', () => {
    assert.equal(supportsPlaceShorthands(['chrome 120', 'chrome 59']), false);
  });

  test('compares dotted versions numerically rather than as strings', () => {
    assert.equal(supportsPlaceShorthands(['safari 9.1']), false);
  });

  test('uses the lower bound of a version range', () => {
    assert.equal(supportsPlaceShorthands(['ios_saf 10.3-10.4']), false);
  });

  test('accepts a technology preview', () => {
    assert.equal(supportsPlaceShorthands(['safari TP']), true);
  });

  test('rejects a browser without compatibility data', () => {
    assert.equal(supportsPlaceShorthands(['kaios 3.0-3.1']), false);
  });

  test('rejects an unversioned browser entry', () => {
    assert.equal(supportsPlaceShorthands(['op_mini all']), false);
  });
});
