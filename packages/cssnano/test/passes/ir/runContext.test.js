import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { createRunContext } from '../../../src/passes/ir/runContext.js';

/**
 * @param {string} css one declaration
 * @return {import('postcss').Declaration}
 */
function declarationOf(css) {
  return /** @type {import('postcss').Declaration} */ (
    postcss.parse(`a{${css}}`).first.first
  );
}

test('should assign a declaration the same key in a second run as a fresh run does', () => {
  const first = createRunContext();
  first.declarations.keyOf(declarationOf('color:red'));
  first.declarations.keyOf(declarationOf('width:1px'));

  const second = createRunContext();
  const fresh = createRunContext();
  assert.equal(
    second.declarations.keyOf(declarationOf('height:1px')),
    fresh.declarations.keyOf(declarationOf('height:1px'))
  );
});

test('should give each run its own property table', () => {
  const first = createRunContext();
  const second = createRunContext();
  assert.notEqual(first.properties, second.properties);
});
