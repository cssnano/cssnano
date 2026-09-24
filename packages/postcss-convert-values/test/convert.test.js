import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import convert, { roundToPrecision } from '../src/lib/convert.js';

describe('Standalone convert() contracts', () => {
  test('should not convert 0px to 0in', () => {
    assert.equal(convert(0, 'px', {}), '0px');
  });

  test('should convert 0rad to 0deg', () => {
    assert.equal(convert(0, 'rad', {}), '0deg');
  });

  test('should convert 0ms to 0s', () => {
    assert.equal(convert(0, 'ms', {}), '0s');
  });

  test('should not convert 0s to 0ms', () => {
    assert.equal(convert(0, 's', {}), '0s');
  });

  test('should convert 0khz to 0hz', () => {
    assert.equal(convert(0, 'khz', {}), '0hz');
  });

  test('should not convert 0hz to 0khz', () => {
    assert.equal(convert(0, 'hz', {}), '0hz');
  });

  test('should convert milliseconds to seconds when shorter', () => {
    assert.equal(convert(1000, 'ms', {}), '1s');
    assert.equal(convert(500, 'ms', {}), '.5s');
  });

  test('should convert seconds to milliseconds when shorter', () => {
    assert.equal(convert(0.005, 's', {}), '5ms');
  });

  test('should convert frequency units between hz and khz when shorter', () => {
    assert.equal(convert(1000, 'hz', {}), '1khz');
    assert.equal(convert(2000, 'hz', {}), '2khz');
    assert.equal(convert(2, 'khz', {}), '2khz');
  });

  test('should ignore negative precision in roundToPrecision and treat as default', () => {
    assert.equal(roundToPrecision(6.66667, -1), 6.66667);
    assert.equal(roundToPrecision(6.66667, -5), 6.66667);
  });

  test('should round accurately with non-negative precision in roundToPrecision', () => {
    assert.equal(roundToPrecision(6.66667, 2), 6.67);
    assert.equal(roundToPrecision(6.66667, 0), 7);
  });

  test('should convert metric units when shorter', () => {
    assert.equal(convert(10, 'mm', {}), '1cm');
    assert.equal(convert(1000, 'q', {}), '25cm');
    assert.equal(convert(0.1, 'cm', {}), '4q');
    assert.equal(convert(5, 'mm', {}), '5mm');
  });

  test('should convert negative values when shorter', () => {
    assert.equal(convert(-1000, 'ms', {}), '-1s');
    assert.equal(convert(-0.005, 's', {}), '-5ms');
    assert.equal(convert(-1000, 'hz', {}), '-1khz');
  });

  test('should handle boundary precision in roundToPrecision', () => {
    assert.equal(roundToPrecision(0, 2), 0);
    assert.equal(roundToPrecision(1.005, 2), 1.01);
    assert.equal(roundToPrecision(-1.005, 2), -1.01);
    assert.equal(roundToPrecision(1.5, 0), 2);
    assert.equal(roundToPrecision(-1.5, 0), -2);
    assert.equal(roundToPrecision(1e-5, 6), 0.00001);
    assert.equal(roundToPrecision(Number.NaN, 2), Number.NaN);
    assert.equal(roundToPrecision(Infinity, 2), Infinity);
  });

  test('should round scientific notation numbers accurately with roundToPrecision', () => {
    assert.equal(roundToPrecision(1.2345e2, 2), 123.45);
    assert.equal(roundToPrecision(1.23456e2, 2), 123.46);
    assert.equal(roundToPrecision(9.8765e-2, 3), 0.099);
  });
});
