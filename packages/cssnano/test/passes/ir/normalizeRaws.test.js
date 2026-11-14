import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import normalizeWhitespace from '../../../src/plugins/postcss-normalize-whitespace/index.js';
import defaultPreset from '#presets/default';
import { createRunContext } from '../../../src/passes/ir/runContext.js';
import { runDriver } from '../../../src/passes/ir/runDriver.js';
import {
  normalizeEntry,
  normalizeRecordRaws,
} from '../../../src/passes/ir/normalizeRaws.js';
import { AT_RULE_BLOCK, RULE } from '../../../src/passes/ir/blockRecord.js';
import { writeRootAfter } from '../../../src/passes/ir/rawEdits.js';

/**
 * The text of `css` after the node form of normalizeWhitespace, which is the
 * oracle the record form must match.
 *
 * @param {string} css
 * @return {Promise<string>}
 */
async function nodeFormOf(css) {
  const result = await postcss([normalizeWhitespace()]).process(css, {
    from: undefined,
  });
  return result.css;
}

/**
 * The text of `css` after the record form: build, the visit, then the end.
 *
 * @param {string} css
 * @return {string}
 */
function recordFormOf(css) {
  const root = postcss.parse(css);
  const context = createRunContext(true);
  const state = runDriver.build(root, context);
  normalizeRecordRaws(state.records, context.tokenLists);
  runDriver.end(state, {
    browsers: [],
    folded: false,
    result: /** @type {import('postcss').Result} */ (
      /** @type {unknown} */ ({ messages: [] })
    ),
  });
  return root.toString();
}

describe('normalizeWhitespace over the records', () => {
  const corpus = [
    '\n\n\ta {\n  color : red !  important ;\n}\n',
    '@media  screen   and (min-width:1px)  {\n  a{ color:red }\n}\n',
    '@import url(x.css)  screen ;\n',
    '@layer  a , b ;\n',
    ':root {\n  --x :  1px ;\n  --y:  ;\n  --z : /*c*/ 2px;\n}\n',
    'a{color:red /* keep */ !important}\n',
    'a /* x */ {color:red}\n',
    '@media /*x*/ print{a{color:red}}\n',
    '\n  a{}\n  b{color:red}\n\n',
  ];

  for (const css of corpus) {
    test(`prints the same text as the node form for ${JSON.stringify(css)}`, async () => {
      assert.equal(recordFormOf(css), await nodeFormOf(css));
    });
  }
});

describe('the leading whitespace of a stylesheet whose first rule is removed', () => {
  test('the default preset prints the next rule with no leading whitespace', async () => {
    const result = await postcss(defaultPreset()).process(
      '\n  a{}\n  b{color:red}\n',
      { from: undefined }
    );
    assert.equal(result.css, 'b{color:red}');
  });
});

describe('normalizeWhitespace visits one entry by index', () => {
  test('visiting every entry in pre-order prints the whole-tree text', () => {
    const css = '\n  a{ color : red }\n  @media print{ b{top:0} }\n';
    const root = postcss.parse(css);
    const context = createRunContext(true);
    const state = runDriver.build(root, context);
    const { records } = state;
    const { tokenLists } = context;
    /** @param {number} container @param {boolean} isRoot */
    const visit = (container, isRoot) => {
      let first = true;
      for (
        let entry = records.links.firstChild(container);
        entry !== -1;
        entry = records.links.nextSibling(entry)
      ) {
        normalizeEntry(records, tokenLists, entry, isRoot && first);
        first = false;
        const { kind } = records.entry(entry);
        if (kind === RULE || kind === AT_RULE_BLOCK) visit(entry, false);
      }
    };
    visit(records.root.index, true);
    writeRootAfter(records, '');
    runDriver.end(state, {
      browsers: [],
      folded: false,
      result: /** @type {import('postcss').Result} */ (
        /** @type {unknown} */ ({ messages: [] })
      ),
    });
    assert.equal(root.toString(), recordFormOf(css));
  });
});
