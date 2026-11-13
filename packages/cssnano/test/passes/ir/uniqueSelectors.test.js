import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import uniqueSelectors from '../../../src/plugins/postcss-unique-selectors/index.js';
import { createRunContext } from '../../../src/passes/ir/runContext.js';
import { runDriver } from '../../../src/passes/ir/runDriver.js';
import { uniqueRuleSelectors } from '../../../src/passes/ir/uniqueSelectors.js';

/** @import {BlockRecords} from '../../../src/passes/ir/blockRecords.js' */
/** @import {RunContext} from '../../../src/passes/ir/runContext.js' */
/** @import {ArenaIndex} from '../../../src/passes/ir/blockRecord.js' */

/**
 * The text of `css` after the node form of uniqueSelectors, the oracle.
 *
 * @param {string} css
 * @return {Promise<string>}
 */
async function nodeFormOf(css) {
  const result = await postcss([uniqueSelectors()]).process(css, {
    from: undefined,
  });
  return result.css;
}

/**
 * Applies the record form to every rule of the arena, depth first.
 *
 * @param {BlockRecords} records
 * @param {RunContext} context
 * @param {ArenaIndex} parent
 * @return {void}
 */
function visitRules(records, context, parent) {
  const { links } = records;
  for (let child = links.firstChild(parent); child !== -1;) {
    uniqueRuleSelectors(records, context, child);
    visitRules(records, context, child);
    child = links.nextSibling(child);
  }
}

/**
 * The text of `css` after the record form: build, the visit, then the end.
 *
 * @param {string} css
 * @return {string}
 */
function recordFormOf(css) {
  const root = postcss.parse(css);
  const context = createRunContext(undefined, true);
  const state = runDriver.build(root, context);
  visitRules(state.records, context, state.records.root.index);
  runDriver.end(state, {
    browsers: [],
    folded: false,
    result: /** @type {import('postcss').Result} */ (
      /** @type {unknown} */ ({ messages: [] })
    ),
  });
  return root.toString();
}

describe('uniqueSelectors over the records', () => {
  // Inputs whose node form and record form print the same text.
  const agreeing = [
    'h1,h1,h1,h1{color:red}',
    'h1,h10,H2,h7{color:red}',
    'a/**/b,ab{color:red}',
    'svg|a,svg\\7c a,svg|a{color:red}',
    'a,{color:red}',
    '.x' + '/*x*/'.repeat(3) + ',' + '.x' + '/*x*/'.repeat(3) + '{color:red}',
  ];

  for (const css of agreeing) {
    test(`prints the same text as the node form for ${JSON.stringify(css)}`, async () => {
      assert.equal(recordFormOf(css), await nodeFormOf(css));
    });
  }

  // The record form joins the selectors with bare commas, so whitespace after a
  // top-level comma is no longer kept (U7).
  test('joins top-level selectors with a bare comma', () => {
    assert.equal(
      recordFormOf(
        '.a\\,b, [data-value="a,b"], :is(.c, .d), .a\\,b{color:red}'
      ),
      '.a\\,b,:is(.c, .d),[data-value="a,b"]{color:red}'
    );
  });

  test('drops the whitespace after a leading empty selector and a comma', () => {
    assert.equal(
      recordFormOf('a,,a, :is(.b, .c), :is(.b, .c){color:red}'),
      ',:is(.b, .c),a{color:red}'
    );
  });

  // PostCSS holds a comment that is not inside a selector item in `raws.selector`,
  // so the record form does not see it (U7).
  test('drops a comment that PostCSS holds in the selector raws', () => {
    assert.equal(
      recordFormOf('.newbackbtn,/*.searchall,*/.calNav{padding:5px;}'),
      '.calNav,.newbackbtn{padding:5px;}'
    );
  });

  test('keeps the comments of the items that the record form sees', () => {
    assert.equal(
      recordFormOf('.x/*a*/,/*b*/.y/*c*/,.x,.y{padding:5px;}'),
      '.x/*a*/,.y/*c*/{padding:5px;}'
    );
  });

  test('drops a comment that PostCSS holds in the raws of a repeated selector', () => {
    assert.equal(recordFormOf('a/**/ b,a b{color:red}'), 'a b{color:red}');
  });

  test('does not write a rule whose selectors are already unique and sorted', () => {
    const root = postcss.parse('a,b{color:red}');
    const context = createRunContext(undefined, true);
    const state = runDriver.build(root, context);
    const { records } = state;
    const rule = records.links.firstChild(records.root.index);
    uniqueRuleSelectors(records, context, rule);
    assert.equal(records.entry(rule).marked, false);
  });

  test('does not write a rule with one selector', () => {
    const root = postcss.parse('.a{color:red}');
    const context = createRunContext(undefined, true);
    const state = runDriver.build(root, context);
    const { records } = state;
    const rule = records.links.firstChild(records.root.index);
    uniqueRuleSelectors(records, context, rule);
    assert.equal(records.entry(rule).marked, false);
  });
});
