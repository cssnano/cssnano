import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import { recordDeclaration } from '../../../../../src/passes/merge/lib/rules/buildRecords.js';
import {
  declarationIsEqual,
  filterRuleIntersections,
} from '../../../../../src/passes/merge/lib/rules/declarations.js';

const context = createRunContext();

/**
 * The record of the first declaration in `css`.
 *
 * @param {string} css
 * @return {import('../../../../../src/passes/ir/declarationRecord.js').DeclarationRecord}
 */
function recordOf(css) {
  const root = postcss.parse(`a{${css}}`);
  const node = /** @type {import('postcss').Declaration} */ (root.first?.first);
  return recordDeclaration(node, context);
}

test('declarationIsEqual treats important: false the same as an unset important flag', () => {
  const unset = recordOf('border-radius:1px');
  const explicitFalse = recordDeclaration(
    postcss.decl({ prop: 'border-radius', value: '1px', important: false }),
    context
  );
  assert.equal(declarationIsEqual(unset, explicitFalse), true);
  assert.equal(declarationIsEqual(explicitFalse, unset), true);
});

test('declarationIsEqual still tells an important declaration from an unset one', () => {
  const unset = recordOf('border-radius:1px');
  const important = recordOf('border-radius:1px!important');
  assert.equal(declarationIsEqual(unset, important), false);
});

/**
 * The declaration records of the rule in `css`, in order.
 *
 * @param {string} css
 * @return {import('../../../../../src/passes/ir/declarationRecord.js').DeclarationRecord[]}
 */
function recordsOf(css) {
  const rule = postcss.parse(css).first;
  return rule.nodes.map((node) =>
    recordDeclaration(
      /** @type {import('postcss').Declaration} */ (node),
      context
    )
  );
}

test('filterRuleIntersections refuses to hoist a color declaration that a later all resets', () => {
  const earlier = recordsOf('a{color:red}');
  const later = recordsOf('b{color:red;all:initial}');
  const { intersection } = filterRuleIntersections(earlier, earlier, later);
  assert.equal(intersection.length, 0);
});

test('filterRuleIntersections hoists a direction declaration that a later all does not reset', () => {
  const earlier = recordsOf('a{direction:rtl}');
  const later = recordsOf('b{direction:rtl;all:initial}');
  const { intersection } = filterRuleIntersections(earlier, earlier, later);
  assert.equal(intersection.length, 1);
});

test('filterRuleIntersections hoists a custom property declaration that a later all does not reset', () => {
  const earlier = recordsOf('a{--x:1}');
  const later = recordsOf('b{--x:1;all:initial}');
  const { intersection } = filterRuleIntersections(earlier, earlier, later);
  assert.equal(intersection.length, 1);
});

test('filterRuleIntersections does not hoist a candidate that a later non-candidate declaration overrides', () => {
  const earlier = recordsOf('a{color:red;color:blue}');
  const later = recordsOf('b{color:red}');
  const { intersection } = filterRuleIntersections(
    [earlier[0]],
    earlier,
    later
  );
  assert.equal(intersection.length, 0);
});

test('filterRuleIntersections keeps blocking a candidate with a declaration dropped in the first round', () => {
  const earlier = recordsOf('a{color:red;color:blue}');
  const later = recordsOf('b{color:red}');
  const { intersection } = filterRuleIntersections(earlier, earlier, later);
  assert.equal(intersection.length, 0);
});
