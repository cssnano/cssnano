import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import { repositoryFile } from '../../../../../../../util/testHelpers.js';
import { transformPlugin } from '#passes/merge';
const plugin = transformPlugin('mergeLonghand');

/**
 * Parses the css, replaces the raw value of its first declaration with a raw
 * that no longer matches the value, and merges the stylesheet.
 *
 * @param {string} css
 * @param {{ raw: string, value: string }} raws
 */
async function mergeWithStaleRaws(css, raws) {
  const root = postcss.parse(css);
  const decl = /** @type {import('postcss').Declaration} */ (
    root.first?.nodes?.[0]
  );
  decl.raws.value = raws;

  await postcss([plugin()]).process(root, { from: repositoryFile });

  return root.toString();
}

describe('border-radius merge reads the value, not a stale raw', () => {
  test('merges corner longhands from the value when raws.value is stale', async () => {
    // The raw ("9px") is left over from an earlier value; the declared value is
    // 1px, so the merged shorthand must be 1px.
    const output = await mergeWithStaleRaws(
      'a{border-top-left-radius:1px;border-top-right-radius:1px;border-bottom-right-radius:1px;border-bottom-left-radius:1px}',
      { raw: '9px', value: '2px' }
    );

    assert.strictEqual(output, 'a{border-radius:1px}');
  });
});
