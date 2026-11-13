import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import normalizeWhitespace from '../../../src/plugins/postcss-normalize-whitespace/index.js';
import { createRunContext } from '../../../src/passes/ir/runContext.js';
import { runDriver } from '../../../src/passes/ir/runDriver.js';
import { normalizeRecordRaws } from '../../../src/passes/ir/normalizeRaws.js';

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
  const context = createRunContext(undefined, true);
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
