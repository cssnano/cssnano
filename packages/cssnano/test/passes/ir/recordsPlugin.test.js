import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import { runRecordsPlugin } from '../../../src/passes/ir/recordsPlugin.js';
import { tokensText } from '../../../src/values/tokensText.js';

/**
 * The selector lists of the first rule, as the records hold them, after a
 * standalone plugin body runs over `css` with no transform of its own.
 *
 * @param {string} css
 * @return {Promise<string>}
 */
async function selectorTextOf(css) {
  const texts = [];
  const plugin = {
    postcssPlugin: 'records-plugin-test',
    OnceExit(root, { result }) {
      runRecordsPlugin(root, result, [
        (records, browsers, context) => {
          const rule = records.links.firstChild(records.root.index);
          for (const id of records.entry(rule).selectorIds) {
            texts.push(tokensText(context.tokenLists.get(id)));
          }
        },
      ]);
    },
  };
  await postcss([plugin]).process(css, { from: undefined });
  return texts.join(',');
}

describe('the standalone records plugin body', () => {
  test('keeps a comment that PostCSS holds only in a rule selector raw', async () => {
    assert.match(await selectorTextOf('a,/*é*/b{top:0}'), /\/\*é\*\//v);
  });
});
