import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { buildRecords } from '../../../../../src/passes/merge/lib/rules/buildRecords.js';
import { RULE } from '../../../../../src/passes/merge/lib/rules/blockRecord.js';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';

/** The rule records of a stylesheet, in document order. */
function rulesOf(css) {
  const { records } = buildRecords(postcss.parse(css), createRunContext());
  const rules = [];
  for (let index = 1; index < records.entryCount(); index++) {
    const entry = records.entry(index);
    if (entry.kind === RULE) rules.push(entry);
  }
  return rules;
}

test('equal selector items share one id, whatever the spacing around their commas', () => {
  const [first, second, third] = rulesOf(
    'a, b{color:red}a,b{color:red}a /* x */, b{color:red}'
  );
  assert.deepEqual(second.selectorIds, first.selectorIds);
  assert.deepEqual(third.selectorIds, first.selectorIds);
});

test('different selector items have different ids', () => {
  const [rule] = rulesOf('a, b{color:red}');
  assert.notEqual(rule.selectorIds[0], rule.selectorIds[1]);
});
