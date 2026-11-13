import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import { buildRecords } from '../../src/passes/ir/buildRecords.js';
import { createRunContext } from '../../src/passes/ir/runContext.js';
import { tokensText } from '../../src/values/tokensText.js';
import { commentStateOf } from '../../src/pipeline/comments/nodeComments.js';
import { declarationPlansOf } from '../../src/pipeline/declarationWalk.js';
import { walkDown } from '../../src/pipeline/walkDown.js';

/** @import {Stage} from '../../src/pipeline/host.js' */

/**
 * A stage that empties the prelude of every at-rule named `name`.
 *
 * @param {string} name
 * @returns {Stage}
 */
function emptiesPrelude(name) {
  return {
    forAtRule: (folded) =>
      folded === name
        ? {
            buffer: (buffer) => {
              buffer.replace(0, buffer.tokens().length, []);
            },
          }
        : null,
  };
}

/**
 * Builds the records of `css` and runs the record walk over them with the
 * stages, as the host does after the build.
 *
 * @param {string} css
 * @param {Stage[]} stages
 * @returns {{records: import('../../src/passes/ir/blockRecords.js').BlockRecords, context: import('../../src/passes/ir/runContext.js').RunContext}}
 */
function walkedRecords(css, stages) {
  const context = createRunContext(undefined, true);
  const { records } = buildRecords(postcss.parse(css), context);
  walkDown(
    records,
    context,
    declarationPlansOf(stages, false, commentStateOf(stages))
  );
  return { records, context };
}

describe('the record walk folds the at-rule preludes', () => {
  test('a block prelude is folded by the record walk, not by the node walk', () => {
    const { records, context } = walkedRecords('@layer a{b{color:red}}', [
      emptiesPrelude('layer'),
    ]);
    const layer = records.links.firstChild(records.root.index);
    assert.equal(
      tokensText(context.tokenLists.get(records.entry(layer).preludeId)),
      ''
    );
  });

  test('a block whose folded prelude is empty is anonymous', () => {
    const { records } = walkedRecords('@layer a{b{color:red}}', [
      emptiesPrelude('layer'),
    ]);
    const layer = records.links.firstChild(records.root.index);
    assert.equal(records.entry(layer).anonymous, true);
  });

  test('a statement whose folded prelude is empty is anonymous', () => {
    const { records } = walkedRecords('@layer a;b{color:red}', [
      emptiesPrelude('layer'),
    ]);
    const statement = records.links.firstChild(records.root.index);
    assert.equal(records.entry(statement).anonymous, true);
  });
});
