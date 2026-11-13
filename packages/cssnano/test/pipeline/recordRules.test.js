import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import { tokenize } from '@csstools/css-tokenizer';
import { buildRecords } from '../../src/passes/ir/buildRecords.js';
import { createRunContext } from '../../src/passes/ir/runContext.js';
import { tokensText } from '../../src/values/tokensText.js';
import { commentStateOf } from '../../src/pipeline/comments/nodeComments.js';
import { declarationPlansOf } from '../../src/pipeline/declarationWalk.js';
import { walkDown } from '../../src/pipeline/walkDown.js';

/** @import {Stage} from '../../src/pipeline/host.js' */

/** The tokens of `text`, as the tokenizer reads them. */
const tokenized = (text) => tokenize({ css: text }).slice(0, -1);

/**
 * A stage that replaces a selector spelled `from` with `to`, and leaves the
 * other selectors alone.
 *
 * @param {string} from
 * @param {string} to
 * @returns {Stage}
 */
function rewriteSelector(from, to) {
  return {
    selector: (buffer) => {
      if (buffer.text() === from) {
        buffer.replace(0, buffer.tokens().length, tokenized(to));
      }
    },
  };
}

/**
 * Builds the records of `css`, then runs the record walk over them with the
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

describe('the record walk over a rule', () => {
  test('a rule whose selector folds has the items of the folded selector as its ids', () => {
    const { records, context } = walkedRecords('a,b{color:red}', [
      rewriteSelector('a,b', 'x,y'),
    ]);
    const rule = records.links.firstChild(records.root.index);
    const items = records
      .rule(rule)
      .selectorIds.map((id) => tokensText(context.tokenLists.get(id)));
    assert.deepEqual(items, ['x', 'y']);
  });

  test('a rule whose selector folds has the whole folded selector as its written list, and is marked', () => {
    const { records, context } = walkedRecords('a,b{color:red}', [
      rewriteSelector('a,b', 'x,y'),
    ]);
    const record = records.rule(records.links.firstChild(records.root.index));
    assert.equal(record.marked, true);
    assert.notEqual(record.writtenList, -1);
    assert.equal(tokensText(context.tokenLists.get(record.writtenList)), 'x,y');
  });

  test('a nesting rule whose selector folds has the context of an equal rule written folded', () => {
    const { records } = walkedRecords('a,b{c{color:red}}x,y{c{color:red}}', [
      rewriteSelector('a,b', 'x,y'),
    ]);
    const folded = records.links.firstChild(records.root.index);
    const written = records.links.nextSibling(folded);
    assert.equal(records.entry(folded).context, records.entry(written).context);
  });
});
