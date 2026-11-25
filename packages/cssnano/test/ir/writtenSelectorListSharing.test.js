import assert from 'node:assert/strict';
import { suite, test } from 'node:test';

// The counter must hook the tokenizer before the build loads it.
const { counter } = await import('../../../../util/countTokenize.js');
const postcss = (await import('postcss')).default;
const { createRunContext } = await import('../../src/run/runContext.js');
const { buildRecords } = await import('../../src/ir/tree/buildRecords.js');
const { writeSelectorList } = await import('../../src/ir/selectorEdits.js');
const { tokens } = await import('../../src/utils/value.js');

/**
 * Writes the list `text` as the selector of a rule and reports the tokenize
 * calls the write made and the spelled text of each item id.
 *
 * @param {string} text
 */
function writeOf(text) {
  const run = createRunContext();
  const { records } = buildRecords(postcss.parse('a{}'), run);
  const record = records.rule(1);
  const list = run.tokenLists.push(tokens(text));
  const before = counter.totalCalls();
  writeSelectorList(record, run, list);
  const calls = counter.totalCalls() - before;
  const spelled = record.selectorIds.map((id) =>
    run.tokenLists
      .get(id)
      .map((t) => t[1])
      .join('')
  );
  return { calls, spelled, run, ids: record.selectorIds };
}

suite(
  'a written selector list gives its items their tokens without tokenizing',
  () => {
    test('a list of two items tokenizes no item', () => {
      assert.equal(writeOf('a,b').calls, 0);
    });

    test('each item of a written list spells its text', () => {
      assert.deepEqual(writeOf('a, bc').spelled, ['a', 'bc']);
    });

    test('the second item of a written list has token positions that start at 0', () => {
      const { run, ids } = writeOf('a, bc');
      const second = run.tokenLists.get(ids[1]);
      assert.equal(second[0][2], 0);
      assert.equal(second[0][3], 1);
    });
  }
);
