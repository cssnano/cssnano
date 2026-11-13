import assert from 'node:assert/strict';
import { suite, test } from 'node:test';

// The counter must hook the tokenizer before the walk loads it.
const { counter } = await import('../../../../util/countTokenize.js');
const { createRunContext } = await import('../../src/passes/ir/runContext.js');
const { default: postcss } = await import('postcss');
const { buildRecords } = await import('../../src/passes/ir/buildRecords.js');
const { walkDown } = await import('../../src/pipeline/walkDown.js');
const { declarationPlansOf } =
  await import('../../src/pipeline/declarationWalk.js');
const { commentStateOf } =
  await import('../../src/pipeline/comments/nodeComments.js');
const { ident } = await import('../../src/values/tokenConstructors.js');
const { tokensText } = await import('../../src/values/tokensText.js');

/** @returns {number} tokenize calls made so far */
function tokenizeTotal() {
  return [...counter.calls.values()].reduce((sum, n) => sum + n, 0);
}

/**
 * The records of a stylesheet after the build and the record walk with
 * `stages`, with the run that holds their token lists.
 *
 * @param {string} css
 * @param {import('../../src/pipeline/host.js').Stage[]} stages
 * @returns {{records: import('../../src/passes/ir/blockRecords.js').BlockRecords, context: import('../../src/passes/ir/runContext.js').RunContext}}
 */
function recordsAfterWalk(css, stages) {
  const context = createRunContext(undefined);
  const { records } = buildRecords(postcss.parse(css), context);
  walkDown(
    records,
    context,
    declarationPlansOf(stages, false, commentStateOf(stages))
  );
  return { records, context };
}

suite(
  'the walk leaves the text the stages fold where the next reader takes it',
  () => {
    test('a written selector reads without tokenizing', () => {
      const stage = {
        selector: (buffer) => buffer.replace(0, 1, [ident('z')]),
      };
      const { records, context } = recordsAfterWalk('a, b {}', [stage]);
      const record = records.rule(records.links.firstChild(records.root.index));
      const before = tokenizeTotal();
      const list = context.tokenLists.get(record.writtenList);
      assert.equal(tokenizeTotal() - before, 0);
      assert.equal(tokensText(list), 'z, b');
    });

    test('a selector a stage leaves unchanged reads without tokenizing', () => {
      const stage = { selector: (buffer) => buffer.tokens() };
      const { records, context } = recordsAfterWalk('a, b {}', [stage]);
      const record = records.rule(records.links.firstChild(records.root.index));
      const before = tokenizeTotal();
      assert.equal(context.tokenLists.get(record.writtenList).length, 4);
      assert.equal(tokenizeTotal() - before, 0);
    });

    test('a selector a fold table served to a second rule reads without tokenizing', () => {
      const stage = {
        selector: (buffer) => buffer.replace(0, 1, [ident('z')]),
      };
      const { records, context } = recordsAfterWalk('a, b {} a, b {}', [stage]);
      const second = records.links.nextSibling(
        records.links.firstChild(records.root.index)
      );
      const before = tokenizeTotal();
      assert.equal(
        tokensText(context.tokenLists.get(records.rule(second).writtenList)),
        'z, b'
      );
      assert.equal(tokenizeTotal() - before, 0);
    });
  }
);
