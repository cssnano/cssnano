import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { discardOverriddenInList } from '../src/lib/decl/overriddenDeclarations.js';
import { applyChildEdits } from '../src/lib/deferredChildEdits.js';

/**
 * @param {string} css
 * @param {Set<string>} [trustedProperties]
 * @param {import('../src/lib/decl/overriddenDeclarations.js').CrossPropertyRule} [crossPropertyRule]
 * @return {string}
 */
function discard(css, trustedProperties, crossPropertyRule) {
  const root = postcss.parse(css);
  const rule = /** @type {import('postcss').Rule} */ (root.first);
  const declarations = /** @type {import('postcss').Declaration[]} */ (
    rule.nodes.filter((node) => node.type === 'decl')
  );

  discardOverriddenInList(declarations, trustedProperties, crossPropertyRule);
  applyChildEdits(rule);
  return root.toString();
}

test('discardOverriddenInList drops a duplicate superseded by its final declaration', () => {
  assert.equal(
    discard('a{margin-top:1px;margin-top:2px;margin-top:3px}'),
    'a{margin-top:3px}'
  );
});

test('discardOverriddenInList matches property names case-insensitively', () => {
  assert.equal(
    discard('a{MARGIN-TOP:1px;margin-top:2px}'),
    'a{margin-top:2px}'
  );
});

test('discardOverriddenInList retains every support-dependent fallback step', () => {
  assert.equal(
    discard(
      'a{margin-top:1px;margin-top:calc(1px);margin-top:env(safe-area-inset-top)}'
    ),
    'a{margin-top:1px;margin-top:calc(1px);margin-top:env(safe-area-inset-top)}'
  );
});

test('discardOverriddenInList preserves style hacks without letting them dominate', () => {
  assert.equal(
    discard('a{margin-top:1px\\9;margin-top:2px;margin-top:3px\\9}'),
    'a{margin-top:1px\\9;margin-top:2px;margin-top:3px\\9}'
  );
});

test('discardOverriddenInList keeps duplicate cleanup within an importance lane', () => {
  assert.equal(
    discard(
      'a{margin-top:1px;margin-top:2px!important;margin-top:3px;margin-top:4px!important}'
    ),
    'a{margin-top:3px;margin-top:4px!important}'
  );
});

test('discardOverriddenInList keeps a value a browser without CSS-wide keyword revert-layer falls back to', () => {
  assert.equal(
    discard('a{column-count:4;column-count:revert-layer}'),
    'a{column-count:4;column-count:revert-layer}'
  );
});

test('discardOverriddenInList keeps a value whose token type differs from the later one', () => {
  assert.equal(
    discard('a{margin-top:1px;margin-top:auto}'),
    'a{margin-top:1px;margin-top:auto}'
  );
});

test('discardOverriddenInList keeps a longhand before its shorthand, which another pass decides', () => {
  assert.equal(
    discard('a{border-top-width:1px;border-top:2px solid red}'),
    'a{border-top-width:1px;border-top:2px solid red}'
  );
});

const marginTop = new Set(['margin-top']);

test('discardOverriddenInList drops a zero length a trusted property later sets to a dimension', () => {
  assert.equal(
    discard('a{margin-top:0;margin-top:1px}', marginTop),
    'a{margin-top:1px}'
  );
});

test('discardOverriddenInList drops a length a trusted property later sets to auto', () => {
  assert.equal(
    discard('a{margin-top:1px;margin-top:auto}', marginTop),
    'a{margin-top:auto}'
  );
});

test('discardOverriddenInList keeps a trusted fallback for a later function needing new support', () => {
  assert.equal(
    discard('a{margin-top:1px;margin-top:env(safe-area-inset-top)}', marginTop),
    'a{margin-top:1px;margin-top:env(safe-area-inset-top)}'
  );
});

test('discardOverriddenInList keeps a trusted value that browsers without revert-layer fall back to', () => {
  assert.equal(
    discard('a{margin-top:1px;margin-top:revert-layer}', marginTop),
    'a{margin-top:1px;margin-top:revert-layer}'
  );
});

test('discardOverriddenInList keeps a trusted value that browsers without dynamic viewport units fall back to', () => {
  assert.equal(
    discard('a{margin-top:10px;margin-top:5dvh}', marginTop),
    'a{margin-top:10px;margin-top:5dvh}'
  );
});

test('discardOverriddenInList keeps a duplicate of a property that is not trusted', () => {
  assert.equal(
    discard('a{margin-top:0;margin-top:1px}', new Set(['margin-left'])),
    'a{margin-top:0;margin-top:1px}'
  );
});

test('discardOverriddenInList applies a cross-property rule to an earlier declaration', () => {
  assert.equal(
    discard('a{border-top-width:1px;border-top:2px solid red}', undefined, {
      overrides: (node, later) =>
        node.prop === 'border-top-width' && later.prop === 'border-top',
    }),
    'a{border-top:2px solid red}'
  );
});

test('discardOverriddenInList consults only declarations a footprint lists for a cross-property rule', () => {
  assert.equal(
    discard('a{border-top-width:1px;border-top:2px solid red}', undefined, {
      overrides: () => true,
      footprint: (node) => (node.prop === 'border-top' ? [] : [node.prop]),
    }),
    'a{border-top-width:1px;border-top:2px solid red}'
  );
});

test('discardOverriddenInList never lets a style hack win a cross-property rule', () => {
  assert.equal(
    discard('a{border-top-width:1px;border-top:2px solid red\\9}', undefined, {
      overrides: () => true,
    }),
    'a{border-top-width:1px;border-top:2px solid red\\9}'
  );
});

test('discardOverriddenInList keeps a cross-property rule within an importance lane', () => {
  assert.equal(
    discard(
      'a{border-top-width:1px;border-top:2px solid red!important}',
      undefined,
      {
        overrides: () => true,
      }
    ),
    'a{border-top-width:1px;border-top:2px solid red!important}'
  );
});

test('discardOverriddenInList keeps a declaration an all declaration separates from its duplicate', () => {
  assert.equal(
    discard('a{margin-top:1px;all:unset;margin-top:2px}'),
    'a{margin-top:1px;all:unset;margin-top:2px}'
  );
});

const overridesWithMargin = (
  /** @type {import('postcss').Declaration} */ earlier,
  /** @type {import('postcss').Declaration} */ later
) => later.prop === 'margin' && earlier.prop !== 'margin';

test('discardOverriddenInList keeps a cross-property rule from reaching across an all declaration', () => {
  assert.equal(
    discard('a{margin-top:1px;all:unset;margin:2px}', undefined, {
      overrides: overridesWithMargin,
      footprint: (node) => [node.prop],
    }),
    'a{margin-top:1px;all:unset;margin:2px}'
  );
});
