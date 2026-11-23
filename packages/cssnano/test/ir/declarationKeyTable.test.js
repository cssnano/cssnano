import assert from 'node:assert/strict';
import { suite, test } from 'node:test';
import { DeclarationKeys, step } from '../../src/ir/declarationKey.js';

suite('the id of a declaration key', () => {
  test('equal name, value, importance and prefix give the same id', () => {
    const keys = new DeclarationKeys();
    assert.equal(keys.keyOf(1, 2, true, ' '), keys.keyOf(1, 2, true, ' '));
  });

  test('a different name gives a different id', () => {
    const keys = new DeclarationKeys();
    assert.notEqual(
      keys.keyOf(1, 2, false, null),
      keys.keyOf(3, 2, false, null)
    );
  });

  test('a different value gives a different id', () => {
    const keys = new DeclarationKeys();
    assert.notEqual(
      keys.keyOf(1, 2, false, null),
      keys.keyOf(1, 3, false, null)
    );
  });

  test('importance gives a different id', () => {
    const keys = new DeclarationKeys();
    assert.notEqual(
      keys.keyOf(1, 2, false, null),
      keys.keyOf(1, 2, true, null)
    );
  });

  test('an important value list does not collide with the next value list', () => {
    const keys = new DeclarationKeys();
    // The flat table packs importance into the low bit of the value list.
    assert.notEqual(
      keys.keyOf(1, 2, true, null),
      keys.keyOf(1, 3, false, null)
    );
  });

  test('importance gives a different id to a hack-prefixed declaration', () => {
    const keys = new DeclarationKeys();
    assert.notEqual(keys.keyOf(1, 2, false, '*'), keys.keyOf(1, 2, true, '*'));
  });

  test('the prefixes of none, a star, and an underscore give three ids', () => {
    const keys = new DeclarationKeys();
    const ids = new Set([
      keys.keyOf(1, 2, false, null),
      keys.keyOf(1, 2, false, '*'),
      keys.keyOf(1, 2, false, '_'),
    ]);
    assert.equal(ids.size, 3);
  });

  test('a stray semicolon before a hack is not part of its prefix', () => {
    const keys = new DeclarationKeys();
    assert.equal(keys.keyOf(1, 2, false, ';*'), keys.keyOf(1, 2, false, '*'));
  });

  test('a prefix of only whitespace is the same as none', () => {
    const keys = new DeclarationKeys();
    assert.equal(keys.keyOf(1, 2, false, '  '), keys.keyOf(1, 2, false, null));
  });

  test('a hack-prefixed key is the same after other keys are made', () => {
    const keys = new DeclarationKeys();
    const first = keys.keyOf(4, 5, true, '*');
    keys.keyOf(9, 9, false, null);
    assert.equal(keys.keyOf(4, 5, true, '*'), first);
  });

  test('a key without a prefix is the same after other keys are made', () => {
    const keys = new DeclarationKeys();
    const first = keys.keyOf(4, 5, false, null);
    keys.keyOf(9, 9, true, '*');
    assert.equal(keys.keyOf(4, 5, false, null), first);
  });

  test('a declaration key never equals a structural id of the same run', () => {
    const keys = new DeclarationKeys();
    const structural = new Set();
    for (let i = 0; i < 50; i++) {
      structural.add(keys.leafOf(step(keys.root, `path-${i}`)));
    }
    const declared = new Set();
    for (let name = 0; name < 5; name++) {
      for (let value = 0; value < 5; value++) {
        declared.add(keys.keyOf(name, value, false, null));
        declared.add(keys.keyOf(name, value, true, '*'));
      }
    }
    assert.equal(declared.size, 50);
    for (const id of declared) assert.equal(structural.has(id), false, `${id}`);
  });
});
