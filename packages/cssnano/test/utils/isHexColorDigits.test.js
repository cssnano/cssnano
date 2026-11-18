import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import isHexColorDigits from '../../src/utils/isHexColorDigits.js';

describe('isHexColorDigits accepts the lengths a hex colour can have', () => {
  for (const digits of ['fff', 'FFFF', 'a1b2c3', '0A1b2C3d']) {
    test(`accepts ${digits}`, () => {
      assert.equal(isHexColorDigits(digits), true);
    });
  }
});

describe('isHexColorDigits rejects lengths a hex colour cannot have', () => {
  for (const digits of ['', 'ff', 'fffff', 'fffffff', 'fffffffff']) {
    test(`rejects ${digits.length} digits`, () => {
      assert.equal(isHexColorDigits(digits), false);
    });
  }
});

describe('isHexColorDigits rejects characters outside the hex digits', () => {
  for (const digits of ['ggg', 'ff#', '12 4', 'fffffg']) {
    test(`rejects ${JSON.stringify(digits)}`, () => {
      assert.equal(isHexColorDigits(digits), false);
    });
  }
});
