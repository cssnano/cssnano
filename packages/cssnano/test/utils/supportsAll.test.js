import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { supportsAll } from '../../src/utils/browserSupport.js';

describe('supportsAll', () => {
  test('is true when every target supports the feature', () => {
    assert.equal(supportsAll(['chrome 150', 'edge 150'], 'css-rrggbbaa'), true);
  });

  test('is false when one target does not support the feature', () => {
    assert.equal(supportsAll(['chrome 150', 'ie 11'], 'css-rrggbbaa'), false);
  });

  test('does not count support that needs a vendor prefix, because the unprefixed syntax fails there', () => {
    assert.equal(supportsAll(['chrome 8'], 'css-autofill'), false);
  });

  test('is true for safari 26.5, which supports css-autofill', () => {
    assert.equal(supportsAll(['safari 26.5'], 'css-autofill'), true);
  });

  test('is false for safari TP, which does not support css-autofill, although safari 26.5 does', () => {
    assert.equal(supportsAll(['safari TP'], 'css-autofill'), false);
  });

  test('counts partial support (a) as unsupported', () => {
    assert.equal(supportsAll(['opera 15'], 'fullscreen'), false);
  });

  test('is false when one target is unknown to the data, because an unknown engine counts as unsupported', () => {
    assert.equal(
      supportsAll(['chrome 150', 'android 150'], 'css-rrggbbaa'),
      false
    );
  });

  test('is false for a release that the installed caniuse-lite does not list, because its support is not known', () => {
    assert.equal(supportsAll(['chrome 999'], 'css-rrggbbaa'), false);
  });

  test('is false for a range that the installed caniuse-lite does not list', () => {
    assert.equal(supportsAll(['ios_saf 99.0-99.2'], 'css-sel3'), false);
  });

  test('is false for a release older than caniuse-lite lists, because its support is not known', () => {
    assert.equal(supportsAll(['chrome 3'], 'css-rrggbbaa'), false);
  });

  test('is false when every target is unknown to the data', () => {
    assert.equal(supportsAll(['android 150'], 'css-rrggbbaa'), false);
  });

  test('is false when the base version that browserslist adds for a range entry lacks support', () => {
    assert.equal(
      supportsAll(['android 4.4.3-4.4.4', 'android 4.4'], 'form-validation'),
      false
    );
  });

  test('is false for an empty target list, because there is no browser to vouch for the feature', () => {
    assert.equal(supportsAll([], 'css-rrggbbaa'), false);
  });

  test('throws a RangeError for a feature key that is not in the data', () => {
    assert.throws(
      () => supportsAll(['chrome 150'], 'css-not-a-feature'),
      RangeError
    );
  });
});

describe('supportsAll on a frozen target list', () => {
  test('gives the same answer on a repeated call with a frozen list that lacks support', () => {
    const targets = Object.freeze(['chrome 150', 'ie 11']);
    assert.equal(supportsAll(targets, 'css-rrggbbaa'), false);
    assert.equal(supportsAll(targets, 'css-rrggbbaa'), false);
  });

  test('gives the same answer on a repeated call with a frozen list that has support', () => {
    const targets = Object.freeze(['chrome 150']);
    assert.equal(supportsAll(targets, 'css-rrggbbaa'), true);
    assert.equal(supportsAll(targets, 'css-rrggbbaa'), true);
  });
});
