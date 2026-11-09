import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { createRunContext } from '../../../src/passes/ir/runContext.js';
import { remove } from '../../../src/passes/merge/lib/rules/treeEdits.js';
import { buildRecords } from '../../../src/passes/merge/lib/rules/buildRecords.js';
import { TextTable } from '../../../src/values/textTable.js';

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

test('a run context created with consistency checks makes a link into a removed rule throw', () => {
  const context = createRunContext(new TextTable(), true);
  const records = buildRecords(postcss.parse('a{color:red}'), context);
  const rule = records.rule(records.links.firstChild(records.root.index));
  remove(records, rule);
  const entry = records.recordRule(postcss.rule({ selector: 'x' }), ['x'], 'x');
  assert.throws(() => records.linkLast(rule.index, entry.index));
});
