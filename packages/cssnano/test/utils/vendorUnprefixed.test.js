import assert from 'node:assert/strict';
import { test } from 'node:test';
import vendorUnprefixed from '../../src/utils/vendorUnprefixed.js';

test('vendorUnprefixed strips a prefix of letters, such as -webkit-', () => {
  assert.equal(vendorUnprefixed('-webkit-transition'), 'transition');
});

test('vendorUnprefixed strips a prefix that holds digits and underscores', () => {
  assert.equal(vendorUnprefixed('-x2_y-color'), 'color');
});

test('vendorUnprefixed strips only the leading prefix, keeping later hyphens', () => {
  assert.equal(vendorUnprefixed('-moz-box-shadow'), 'box-shadow');
});

test('vendorUnprefixed leaves a custom property name alone, since it has no vendor prefix', () => {
  assert.equal(vendorUnprefixed('--webkit-x'), '--webkit-x');
});

test('vendorUnprefixed leaves a name with a hyphen but no closing hyphen alone', () => {
  assert.equal(vendorUnprefixed('-foo'), '-foo');
});

test('vendorUnprefixed leaves an unprefixed name alone', () => {
  assert.equal(vendorUnprefixed('color'), 'color');
});
