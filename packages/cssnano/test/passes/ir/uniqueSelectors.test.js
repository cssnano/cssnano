import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import uniqueSelectors from '../../../src/plugins/postcss-unique-selectors/index.js';
import { createRunContext } from '../../../src/passes/ir/runContext.js';
import { runDriver } from '../../../src/passes/ir/runDriver.js';
import { uniqueRuleSelectors } from '../../../src/passes/ir/uniqueSelectors.js';
import { keepSelectorComments } from '../../../src/passes/ir/keepSelectorComments.js';

/** @import {BlockRecords} from '../../../src/passes/ir/blockRecords.js' */
/** @import {RunContext} from '../../../src/passes/ir/runContext.js' */
/** @import {ArenaIndex} from '../../../src/passes/ir/blockRecord.js' */

/**
 * The text of `css` after the uniqueSelectors plugin, which runs the record form
 * over each rule; the walk over the arena is checked against it.
 *
 * @param {string} css
 * @return {Promise<string>}
 */
async function pluginFormOf(css) {
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
  // The plugin moves the comments PostCSS keeps in a raw selector first.
  root.walkRules(keepSelectorComments);
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
    test(`prints the same text as the plugin for ${JSON.stringify(css)}`, async () => {
      assert.equal(recordFormOf(css), await pluginFormOf(css));
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

  // PostCSS holds a comment that is not inside a selector item in `raws.selector`;
  // the plugin moves it into the selector before the build, so the list keeps it.
  test('keeps a comment that PostCSS holds in the selector raws', () => {
    assert.equal(
      recordFormOf('.newbackbtn,/*.searchall,*/.calNav{padding:5px;}'),
      '/*.searchall,*/.calNav,.newbackbtn{padding:5px;}'
    );
  });

  test('keeps the comments of the items that the record form sees', () => {
    assert.equal(
      recordFormOf('.x/*a*/,/*b*/.y/*c*/,.x,.y{padding:5px;}'),
      '.x/*a*/,/*b*/.y/*c*/{padding:5px;}'
    );
  });

  test('keeps a comment that PostCSS holds in the raws of a repeated selector', () => {
    assert.equal(recordFormOf('a/**/ b,a b{color:red}'), 'a/**/ b{color:red}');
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

  test('keeps the comment of a duplicate selector in a selector the list does not spell', () => {
    assert.equal(recordFormOf('.b,/*c*/.b{color:red}'), '.b/*c*/{color:red}');
  });

  test('keeps the empty selector of a list with comments, so the rule stays invalid', () => {
    assert.equal(
      recordFormOf(':is(/*a*/.x/*b*/,/*c*/.y/*d*/), :is(.x,.y),{padding:5px;}'),
      ',:is(/*a*/.x/*b*/,/*c*/.y/*d*/){padding:5px;}'
    );
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
