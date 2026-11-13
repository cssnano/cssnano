import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { buildRecords } from '../../../../../src/passes/ir/buildRecords.js';
import { RULE } from '../../../../../src/passes/ir/blockRecord.js';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import { tokensText } from '../../../../../src/values/tokensText.js';
import { selectorInfoOf } from '../../../../../src/passes/ir/ensureCompatibility.js';

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

test("each id's token list spells its selector item", () => {
  const context = createRunContext();
  const { records, nodes } = buildRecords(
    postcss.parse('a /* x */, b{color:red}c,a{color:red}b{color:red}'),
    context
  );
  let checked = 0;
  for (let index = 1; index < records.entryCount(); index++) {
    const entry = records.entry(index);
    if (entry.kind !== RULE) continue;
    for (const [at, id] of entry.selectorIds.entries()) {
      assert.equal(
        tokensText(context.tokenLists.get(id)),
        nodes[index].selectors[at]
      );
      checked++;
    }
  }
  assert.equal(checked, 5);
});

test("a selector's facts are the same in every rule that holds it, at any offset and beside any comment", () => {
  const context = createRunContext();
  const { records, nodes } = buildRecords(
    postcss.parse(
      'a,::-webkit-scrollbar{color:red}::-webkit-scrollbar{color:red}a /* x */, ::-webkit-scrollbar{color:red}'
    ),
    context
  );
  const facts = [];
  for (let index = 1; index < records.entryCount(); index++) {
    const entry = records.entry(index);
    if (entry.kind !== RULE) continue;
    const at = nodes[index].selectors.indexOf('::-webkit-scrollbar');
    facts.push(
      selectorInfoOf(context.tokenLists.get(entry.selectorIds[at]), [
        'chrome 120',
      ])
    );
  }
  assert.equal(facts.length, 3);
  assert.deepEqual(facts[1], facts[0]);
  assert.deepEqual(facts[2], facts[0]);
  assert.equal(facts[0].prefix, '-webkit-');
});
