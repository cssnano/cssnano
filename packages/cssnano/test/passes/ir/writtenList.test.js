import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import { createRunContext } from '../../../src/passes/ir/runContext.js';
import { runDriver } from '../../../src/passes/ir/runDriver.js';
import { sourceListOf } from '../../../src/passes/ir/writtenList.js';
import { writePrelude } from '../../../src/passes/ir/rawEdits.js';
import { writeSelectorIds } from '../../../src/passes/ir/selectorEdits.js';
import { addSelectors } from '../../../src/passes/ir/selectorList.js';
import { writeValue } from '../../../src/passes/ir/valueEdits.js';
import { assertRecordsWellFormed } from '../../../src/passes/ir/recordsCheck.js';
import { tokensText } from '../../../src/values/tokensText.js';
import { tokens as tokenize } from '../../../src/utils/value.js';

/** @import {BlockRecords} from '../../../src/passes/ir/blockRecords.js' */
/** @import {RunContext} from '../../../src/passes/ir/runContext.js' */
/** @import {TokenListId} from '../../../src/passes/ir/tokenLists.js' */

/** @type {readonly string[]} */
const NO_BROWSERS = [];

/**
 * The records and run of a stylesheet, built under checks.
 *
 * @param {string} css
 * @return {{records: BlockRecords, context: RunContext}}
 */
function buildOf(css) {
  const context = createRunContext(undefined, true);
  const { records } = runDriver.build(postcss.parse(css), context);
  return { records, context };
}

/**
 * The children of a container, as arena indices in order.
 *
 * @param {BlockRecords} records
 * @param {number} container
 * @return {number[]}
 */
function childrenOf(records, container) {
  const indices = [];
  for (
    let at = records.links.firstChild(container);
    at !== -1;
    at = records.links.nextSibling(at)
  ) {
    indices.push(at);
  }
  return indices;
}

/**
 * The text a token list of the run spells.
 *
 * @param {RunContext} context
 * @param {TokenListId} id
 * @return {string}
 */
function textOf(context, id) {
  return tokensText(context.tokenLists.get(id));
}

/**
 * The first rule of a stylesheet, which holds its declarations.
 *
 * @param {string} css
 * @return {{records: BlockRecords, context: RunContext, rule: number}}
 */
function firstRuleOf(css) {
  const { records, context } = buildOf(css);
  const rule = childrenOf(records, records.root.index)[0];
  return { records, context, rule };
}

describe('the build keeps the written text of a declaration when the value drops a comment', () => {
  test('a declaration with no comment has no written list', () => {
    const { records, rule } = firstRuleOf('a{color:red}');
    const [color] = childrenOf(records, rule);
    assert.equal(records.entry(color).writtenList, -1);
  });

  test('a declaration whose cleaned value drops a plain comment keeps the written text', () => {
    const { records, context, rule } = firstRuleOf('a{top:0 /*x*/ 1}');
    const [top] = childrenOf(records, rule);
    const { valueList, writtenList } = records.entry(top);
    assert.equal(textOf(context, valueList), '0  1');
    assert.equal(textOf(context, writtenList), '0 /*x*/ 1');
  });

  test('a declaration whose value keeps an important comment has no written list', () => {
    const { records, context, rule } = firstRuleOf('a{top:0 /*!x*/ 1}');
    const [top] = childrenOf(records, rule);
    const { valueList, writtenList } = records.entry(top);
    assert.equal(textOf(context, valueList), '0 /*!x*/ 1');
    assert.equal(writtenList, -1);
  });
});

describe('the build keeps the written text of a rule as its written list', () => {
  test('a rule with no comment keeps its selector as written, spaces included', () => {
    const { records, context, rule } = firstRuleOf('a , b{color:red}');
    const { writtenList } = records.entry(rule);
    assert.equal(textOf(context, writtenList), 'a , b');
  });

  test('a rule whose selector holds a comment keeps the comment in its written list', () => {
    const { records, context, rule } = firstRuleOf('a /*x*/ ,b{color:red}');
    const { writtenList } = records.entry(rule);
    assert.equal(textOf(context, writtenList), 'a /*x*/ ,b');
  });

  test('a rule whose selector holds a comment has the items of the written selector as its ids', () => {
    const { records, context, rule } = firstRuleOf('a /*x*/ ,b{color:red}');
    const texts = records
      .entry(rule)
      .selectorIds.map((id) => textOf(context, id));
    assert.deepEqual(texts, ['a /*x*/', 'b']);
  });
});

describe('the build keeps the written text of an at-rule prelude when the params drop a comment', () => {
  test('an at-rule whose params hold no raw has no written list', () => {
    const { records, context } = buildOf('@media screen{a{color:red}}');
    const [media] = childrenOf(records, records.root.index);
    assert.equal(records.entry(media).writtenList, -1);
    assert.equal(textOf(context, records.entry(media).preludeId), 'screen');
  });

  test('an at-rule whose params drop a comment keeps the written params', () => {
    const { records, context } = buildOf(
      '@supports (a:b) /*x*/ and (c:d) {a{color:red}}'
    );
    const [supports] = childrenOf(records, records.root.index);
    const { preludeId, writtenList } = records.entry(supports);
    assert.equal(textOf(context, preludeId), '(a:b)  and (c:d)');
    assert.equal(textOf(context, writtenList), '(a:b) /*x*/ and (c:d)');
  });
});

describe('the build gives no written list to the stylesheet or a comment', () => {
  test('the stylesheet and a comment hold -1', () => {
    const { records } = buildOf('/*x*/a{color:red}');
    const [comment] = childrenOf(records, records.root.index);
    assert.equal(records.root.writtenList, -1);
    assert.equal(records.entry(comment).writtenList, -1);
  });
});

describe('sourceListOf reads the written list of a record, or its identity list when it has none', () => {
  test('a declaration with no written list reads its value list', () => {
    const { records, rule } = firstRuleOf('a{color:red}');
    const [color] = childrenOf(records, rule);
    const entry = records.entry(color);
    assert.equal(sourceListOf(entry), entry.valueList);
  });

  test('a declaration with a written list reads it', () => {
    const { records, rule } = firstRuleOf('a{top:0 /*x*/ 1}');
    const [top] = childrenOf(records, rule);
    const entry = records.entry(top);
    assert.equal(sourceListOf(entry), entry.writtenList);
  });

  test('an at-rule with no written list reads its prelude', () => {
    const { records } = buildOf('@media screen{a{color:red}}');
    const [media] = childrenOf(records, records.root.index);
    const entry = records.entry(media);
    assert.equal(sourceListOf(entry), entry.preludeId);
  });
});

describe('an edit that changes an identity field resets the written list', () => {
  test('writing a declaration value resets its written list', () => {
    const { records, context, rule } = firstRuleOf('a{top:0 /*x*/ 1}');
    const [top] = childrenOf(records, rule);
    writeValue(records, context, top, tokenize('2'));
    assert.equal(records.entry(top).writtenList, -1);
  });

  test('writing an at-rule prelude resets its written list', () => {
    const { records, context } = buildOf(
      '@supports (a:b) /*x*/ and (c:d) {a{color:red}}'
    );
    const [supports] = childrenOf(records, records.root.index);
    writePrelude(context, records.entry(supports), tokenize('(e:f)'));
    assert.equal(records.entry(supports).writtenList, -1);
  });

  test('writing the selector ids of a rule resets its written list', () => {
    const { records, rule } = firstRuleOf('a /*x*/ ,b{color:red}');
    writeSelectorIds(records.entry(rule), records.entry(rule).selectorIds);
    assert.equal(records.entry(rule).writtenList, -1);
  });

  test('adding a selector to a rule resets its written list', () => {
    const { records, context, rule } = firstRuleOf('a /*x*/ ,b{color:red}');
    const id = context.selectorIds.idOf(context.tokenLists, 'c');
    addSelectors(records, rule, [id], context.tokenLists, NO_BROWSERS);
    assert.equal(records.entry(rule).writtenList, -1);
  });
});

describe('the records check holds the written list of every record to its identity', () => {
  test('a fresh build passes the records check', () => {
    const { records, context } = buildOf(
      'a /*x*/ ,b{top:0 /*x*/ 1}@media screen{c{color:red}}'
    );
    const { tokenLists } = context;
    assert.doesNotThrow(() => assertRecordsWellFormed({ records, tokenLists }));
  });

  test('the records check rejects a rule whose ids changed while its written list stayed', () => {
    const { records, context, rule } = firstRuleOf('a /*x*/ ,b{color:red}');
    const other = context.selectorIds.idOf(context.tokenLists, 'c');
    /** @type {{selectorIds: TokenListId[]}} */ (
      records.entry(rule)
    ).selectorIds = [other];
    const { tokenLists } = context;
    assert.throws(() => assertRecordsWellFormed({ records, tokenLists }));
  });
});
