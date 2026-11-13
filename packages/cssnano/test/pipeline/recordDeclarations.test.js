import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import { tokenize } from '@csstools/css-tokenizer';
import { buildRecords } from '../../src/passes/ir/buildRecords.js';
import { createRunContext } from '../../src/passes/ir/runContext.js';
import { commentStateOf } from '../../src/pipeline/comments/nodeComments.js';
import { declarationPlansOf } from '../../src/pipeline/declarationWalk.js';
import { walkDown } from '../../src/pipeline/walkDown.js';
import { hostPlugin } from '../../src/pipeline/host.js';

/** @import {Stage} from '../../src/pipeline/host.js' */

/** The tokens of `text`, as the tokenizer reads them. */
const tokenized = (text) => tokenize({ css: text }).slice(0, -1);

/**
 * A stage that appends `suffix` to the value of `color`, and leaves other
 * properties alone.
 *
 * @param {string} suffix
 * @returns {Stage}
 */
function appendToColor(suffix) {
  return {
    forProperty: (property) =>
      property === 'color'
        ? (buffer) => {
            const end = buffer.tokens().length;
            buffer.replace(end, end, tokenized(suffix));
          }
        : null,
  };
}

/**
 * A stage that removes the comments `canRemove` accepts, with no reducer.
 *
 * @param {(comment: string) => boolean} canRemove
 * @returns {Stage}
 */
function removeComments(canRemove) {
  return { comments: () => canRemove };
}

/**
 * Builds the records of `css`, then runs the record walk over them with the
 * stages, as the host does after the build. It returns the first declaration
 * of the stylesheet's first rule, and the run context.
 *
 * @param {string} css
 * @param {Stage[]} stages
 * @returns {{record: import('../../src/passes/ir/declarationRecord.js').DeclarationRecord, context: import('../../src/passes/ir/runContext.js').RunContext, before: number}}
 */
function declarationAfterWalk(css, stages) {
  const context = createRunContext(true);
  const { records } = buildRecords(postcss.parse(css), context);
  const rule = records.links.firstChild(records.root.index);
  const index = records.links.firstChild(rule);
  const before = records.entry(index).writtenList;
  walkDown(
    records,
    context,
    declarationPlansOf(stages, false, commentStateOf(stages))
  );
  return {
    record:
      /** @type {import('../../src/passes/ir/declarationRecord.js').DeclarationRecord} */ (
        records.entry(index)
      ),
    context,
    before,
  };
}

describe('the record walk over a declaration', () => {
  test('a declaration the walk folds is marked, with the result as its value and no written list', () => {
    const { record, context } = declarationAfterWalk('a{color:red}', [
      appendToColor('!'),
    ]);
    assert.equal(record.marked, true);
    assert.equal(record.writtenList, -1);
    assert.equal(
      record.valueList,
      context.valueIds.idOf(context.tokenLists, undefined, 'red!')
    );
  });

  test('a declaration whose fold changes nothing is not marked and keeps its written list', () => {
    const { record, before } = declarationAfterWalk(
      'a{color:red/* keep */ blue}',
      [removeComments(() => false)]
    );
    assert.notEqual(before, -1, 'the comment is only in the written list');
    assert.equal(record.marked, false);
    assert.equal(record.writtenList, before);
  });

  test('a declaration whose only change is a removed comment is written, under a stage with no plan for it', () => {
    const { record, context } = declarationAfterWalk(
      'a{color:red/* gone */ blue}',
      [removeComments(() => true)]
    );
    assert.equal(record.marked, true);
    assert.equal(record.writtenList, -1);
    assert.equal(
      record.valueList,
      context.valueIds.idOf(context.tokenLists, undefined, 'red blue')
    );
  });
});

describe('a comment in a unicode-range value', () => {
  test('is removed as it is in other values, with the space the removal leaves', async () => {
    const host = hostPlugin([
      {
        entry: {
          create: () => ({
            comments: () => (comment) => comment.includes('drop'),
          }),
        },
        options: {},
        targets: false,
      },
    ]);
    const result = await postcss([host]).process(
      'a{unicode-range:U+0025/* drop */-00FF}',
      { from: undefined }
    );
    assert.equal(result.css, 'a{unicode-range:U+0025 -00FF}');
  });
});
