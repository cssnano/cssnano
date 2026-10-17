import { describe, test } from 'node:test';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import isRecord from '../../src/utils/isRecord.js';

describe('isRecord', () => {
  test('accepts an object literal', () => {
    assert.equal(isRecord({ query: 'defaults' }), true);
  });

  test('accepts an object with no prototype, such as a module namespace', () => {
    assert.equal(isRecord(Object.create(null)), true);
  });

  test('accepts an object literal created in another realm, such as a vm context', () => {
    assert.equal(isRecord(vm.runInNewContext('({ query: "defaults" })')), true);
  });

  test('rejects an array created in another realm', () => {
    assert.equal(isRecord(vm.runInNewContext('[]')), false);
  });

  test('rejects a Map, whose entries are not own keys', () => {
    assert.equal(isRecord(new Map([['query', 'defaults']])), false);
  });

  test('rejects a Date', () => {
    assert.equal(isRecord(new Date()), false);
  });

  test('rejects an instance of a class', () => {
    class Targets {}
    assert.equal(isRecord(new Targets()), false);
  });

  test('rejects an array, null and a primitive', () => {
    for (const value of [[], null, 'defaults', 1]) {
      assert.equal(isRecord(value), false);
    }
  });
});
