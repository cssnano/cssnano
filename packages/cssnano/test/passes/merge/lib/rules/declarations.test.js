import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { DeclarationKeys } from '../../../../../src/passes/ir/declarationKey.js';
import { recordDeclaration } from '../../../../../src/passes/ir/declarationRecord.js';
import { PropertyTable } from '../../../../../src/passes/ir/propertyTable.js';
import { declarationIsEqual } from '../../../../../src/passes/merge/lib/rules/declarations.js';

const properties = new PropertyTable();
const declarationIds = new DeclarationKeys();

/**
 * The record of the first declaration in `css`.
 *
 * @param {string} css
 * @return {import('../../../../../src/passes/ir/declarationRecord.js').DeclarationRecord}
 */
function recordOf(css) {
  const root = postcss.parse(`a{${css}}`);
  const node = /** @type {import('postcss').Declaration} */ (root.first?.first);
  return recordDeclaration(node, properties, declarationIds);
}

test('declarationIsEqual treats important: false the same as an unset important flag', () => {
  const unset = recordOf('border-radius:1px');
  const explicitFalse = recordDeclaration(
    postcss.decl({ prop: 'border-radius', value: '1px', important: false }),
    properties,
    declarationIds
  );
  assert.equal(declarationIsEqual(unset, explicitFalse), true);
  assert.equal(declarationIsEqual(explicitFalse, unset), true);
});

test('declarationIsEqual still tells an important declaration from an unset one', () => {
  const unset = recordOf('border-radius:1px');
  const important = recordOf('border-radius:1px!important');
  assert.equal(declarationIsEqual(unset, important), false);
});
