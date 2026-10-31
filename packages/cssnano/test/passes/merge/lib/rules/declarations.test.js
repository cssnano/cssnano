import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { declarationIsEqual } from '../../../../../src/passes/merge/lib/rules/declarations.js';

/**
 * @param {string} css
 * @return {import('postcss').Declaration}
 */
function parseDeclaration(css) {
  const root = postcss.parse(`a{${css}}`);
  return /** @type {import('postcss').Declaration} */ (root.first.first);
}

test('declarationIsEqual treats important: false the same as an unset important flag', () => {
  const unset = parseDeclaration('border-radius:1px');
  const explicitFalse = postcss.decl({
    prop: 'border-radius',
    value: '1px',
    important: false,
  });
  assert.equal(declarationIsEqual(unset, explicitFalse), true);
  assert.equal(declarationIsEqual(explicitFalse, unset), true);
});

test('declarationIsEqual still tells an important declaration from an unset one', () => {
  const unset = parseDeclaration('border-radius:1px');
  const important = parseDeclaration('border-radius:1px!important');
  assert.equal(declarationIsEqual(unset, important), false);
});
