import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import cleanupDeclarations from '../src/lib/cleanupDeclarations.js';

/**
 * @param {string} css
 * @param {(node: import('postcss').Declaration, later: import('postcss').Declaration) => boolean} [isLowerPrecedence]
 * @return {string}
 */
function cleanup(css, isLowerPrecedence = () => false) {
  const root = postcss.parse(css);
  const rule = /** @type {import('postcss').Rule} */ (root.first);
  const declarations = /** @type {import('postcss').Declaration[]} */ (
    rule.nodes.filter((node) => node.type === 'decl')
  );

  cleanupDeclarations(new Set(declarations), isLowerPrecedence);
  return root.toString();
}

test('cleanupDeclarations drops a duplicate superseded by its final declaration', () => {
  assert.equal(
    cleanup('a{margin-top:1px;margin-top:2px;margin-top:3px}'),
    'a{margin-top:3px}'
  );
});

test('cleanupDeclarations retains every support-dependent fallback step', () => {
  assert.equal(
    cleanup(
      'a{margin-top:1px;margin-top:calc(1px);margin-top:env(safe-area-inset-top)}'
    ),
    'a{margin-top:1px;margin-top:calc(1px);margin-top:env(safe-area-inset-top)}'
  );
});

test('cleanupDeclarations preserves style hacks without letting them dominate', () => {
  assert.equal(
    cleanup('a{margin-top:1px\\9;margin-top:2px;margin-top:3px\\9}'),
    'a{margin-top:1px\\9;margin-top:2px;margin-top:3px\\9}'
  );
});

test('cleanupDeclarations keeps duplicate cleanup within an importance lane', () => {
  assert.equal(
    cleanup(
      'a{margin-top:1px;margin-top:2px!important;margin-top:3px;margin-top:4px!important}'
    ),
    'a{margin-top:3px;margin-top:4px!important}'
  );
});

test('cleanupDeclarations applies border shorthand precedence to retained candidates', () => {
  assert.equal(
    cleanup(
      'a{border-top-width:1px;border-top:2px solid red}',
      (node, later) =>
        node.prop === 'border-top-width' && later.prop === 'border-top'
    ),
    'a{border-top:2px solid red}'
  );
});
