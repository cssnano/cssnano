import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { AT_RULE_STATEMENT } from '../../../src/passes/ir/blockRecord.js';
import { createRunContext } from '../../../src/passes/ir/runContext.js';
import MergeState from '../../../src/passes/merge/lib/rules/mergeState.js';
import { TextTable } from '../../../src/values/textTable.js';
import {
  blockRecordOf,
  buildTestRecords,
  ruleRecordOf,
} from '../merge/lib/rules/liveRecords.js';
import { transformPlugin } from '../../../src/passes/merge/index.js';

/**
 * @param {string} css
 * @return {{root: import('postcss').Root, records: import('../../../src/passes/ir/blockRecords.js').BlockRecords}}
 */
function build(css) {
  const root = postcss.parse(css);
  const state = new MergeState(
    ['chrome 120'],
    createRunContext(undefined, true)
  );
  const records = buildTestRecords(root, state, new TextTable(), true);
  return { root, records };
}

test('a rule record holds its node between, after and semicolon', () => {
  const { root, records } = build('a  {color:red;\n}');
  const rule = /** @type {import('postcss').Rule} */ (root.first);
  const record = ruleRecordOf(records, rule);
  assert.equal(record.between, '  ');
  assert.equal(record.after, '\n');
  assert.equal(record.semicolon, true);
});

test('an at-rule block holds its node between, after, semicolon and afterName', () => {
  const { root, records } = build('@media  print {a{color:red}\n}');
  const media = /** @type {import('postcss').AtRule} */ (root.first);
  const block = blockRecordOf(records, media);
  assert.equal(block.between, ' ');
  assert.equal(block.after, '\n');
  assert.equal(block.semicolon, false);
  assert.equal(block.afterName, '  ');
});

test('an at-rule statement holds its node between and afterName', () => {
  const { records } = build('@charset  "utf-8" ;');
  const statements = [];
  for (
    let entry = records.links.firstChild(records.root.index);
    entry !== -1;
    entry = records.links.nextSibling(entry)
  ) {
    const record = records.entry(entry);
    if (record.kind === AT_RULE_STATEMENT) statements.push(record);
  }
  assert.equal(statements.length, 1);
  assert.equal(statements[0].between, ' ');
  assert.equal(statements[0].afterName, '  ');
});

test('a rule with no semicolon raw keeps none after the write', async () => {
  const root = postcss.parse('a{color:red}');
  const added = postcss.rule({ selector: 'b' });
  added.append(postcss.decl({ prop: 'color', value: 'blue' }));
  root.append(added);
  await postcss([transformPlugin('mergeRules', true)()]).process(root, {
    from: undefined,
  });
  assert.equal(added.raws.semicolon, undefined);
});

test('a merged rule prints its template between, after and semicolon', async () => {
  const result = await postcss([transformPlugin('mergeRules', true)()]).process(
    'a{color:red}b  {color:red;\n}',
    { from: undefined }
  );
  assert.equal(result.css, 'a,b  {color:red;\n}');
});
