import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { DeclarationKeys } from '../../../src/passes/ir/declarationKey.js';

/**
 * @param {string} css one declaration
 * @return {import('postcss').Declaration}
 */
function declarationOf(css) {
  return /** @type {import('postcss').Declaration} */ (
    postcss.parse(`a{${css}}`).first.first
  );
}

test('should give equal declarations the same key', () => {
  const keys = new DeclarationKeys();
  assert.equal(
    keys.keyOf(declarationOf('color:red')),
    keys.keyOf(declarationOf('color:red'))
  );
});

test('should give declarations that differ only in a hack prefix different keys', () => {
  const keys = new DeclarationKeys();
  assert.notEqual(
    keys.keyOf(declarationOf('*zoom:1')),
    keys.keyOf(declarationOf('zoom:1'))
  );
});

test('should give declarations that differ only in importance different keys', () => {
  const keys = new DeclarationKeys();
  assert.notEqual(
    keys.keyOf(declarationOf('color:red!important')),
    keys.keyOf(declarationOf('color:red'))
  );
});

test('should fold the ASCII case of a standard property name', () => {
  const keys = new DeclarationKeys();
  assert.equal(
    keys.keyOf(declarationOf('COLOR:red')),
    keys.keyOf(declarationOf('color:red'))
  );
});

test('should keep the case of a custom property name', () => {
  const keys = new DeclarationKeys();
  assert.notEqual(
    keys.keyOf(declarationOf('--Foo:1')),
    keys.keyOf(declarationOf('--foo:1'))
  );
});

test('should give the same key to a declaration that has no raws.before', () => {
  const keys = new DeclarationKeys();
  const bare = declarationOf('color:red');
  delete bare.raws.before;
  assert.equal(keys.keyOf(bare), keys.keyOf(declarationOf('color:red')));
});

test('should give a declaration with important false the key of one without importance', () => {
  const keys = new DeclarationKeys();
  const explicit = declarationOf('color:red');
  explicit.important = false;
  assert.equal(keys.keyOf(explicit), keys.keyOf(declarationOf('color:red')));
});
