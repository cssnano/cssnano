import { test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import { commitShorthand } from '../../../../../src/passes/merge/lib/longhand/decl/slotVector.js';
import { TextTable } from '../../../../../src/values/textTable.js';

/**
 * @param {string} css
 * @return {import('postcss').Rule}
 */
function parseRule(css) {
  return /** @type {import('postcss').Rule} */ (postcss.parse(css).first);
}

/**
 * @param {import('postcss').Rule} rule
 * @param {import('postcss').Declaration[]} contributing
 * @param {string} prop
 * @param {string} value
 */
function commit(rule, contributing, prop, value) {
  return commitShorthand(
    rule,
    contributing.map((decl) => ({ value: decl.value, decl })),
    new Set(contributing),
    new Set(),
    { prop, value, important: false },
    new TextTable()
  );
}

test('commitShorthand returns the lone same-property declaration it rewrote in place', () => {
  const rule = parseRule('a { border-radius: 1px 1px 1px 1px }');
  const [decl] = /** @type {import('postcss').Declaration[]} */ (rule.nodes);
  assert.equal(commit(rule, [decl], 'border-radius', '1px'), decl);
  assert.equal(decl.value, '1px');
});

test('commitShorthand returns the declaration it inserted for a profitable cover', () => {
  const rule = parseRule(
    'a { border-top-left-radius: 1px; border-top-right-radius: 1px; border-bottom-right-radius: 1px; border-bottom-left-radius: 1px }'
  );
  const decls = /** @type {import('postcss').Declaration[]} */ (rule.nodes);
  const written = commit(rule, [...decls], 'border-radius', '1px');
  assert.equal(written?.prop, 'border-radius');
  assert.equal(written?.parent, rule);
  assert.ok(decls.every((decl) => decl.parent === undefined));
});

test('commitShorthand returns undefined when no declaration is removable, so nothing is written', () => {
  const rule = parseRule('a { border-radius: 1px }');
  assert.equal(commit(rule, [], 'border-radius', '1px'), undefined);
});

test('commitShorthand returns undefined when the cover costs more than the declarations it removes', () => {
  const rule = parseRule('a { border-top-left-radius: 1px; color: red }');
  const [decl] = /** @type {import('postcss').Declaration[]} */ (rule.nodes);
  assert.equal(
    commit(rule, [decl], 'border-radius', '1px 2px 3px 4px / 5px'),
    undefined
  );
  assert.equal(decl.prop, 'border-top-left-radius');
});
