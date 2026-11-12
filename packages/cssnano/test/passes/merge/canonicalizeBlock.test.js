import { test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import { resolveTargets } from '#utils/browser-targets';
import { secondRoundOfText } from './lib/longhand/helpers/reduceRuns.js';

const browsers = resolveTargets({}, { opts: { from: 'block.css' } });

/**
 * Canonicalizes every declaration block of `css` in one longhand round on the
 * records, then writes the records back, and returns the stylesheet text.
 *
 * @param {string} css
 * @return {string}
 */
function canonicalizeBlocks(css) {
  return secondRoundOfText(css, browsers);
}

/** @param {string} css */
const ruleCount = (css) => postcss.parse(css).nodes.length;

const blocks = [
  'a{margin-top:1px;margin-right:1px;margin-bottom:1px;margin-left:1px}',
  'a{color:red;color:blue;COLOR:green}',
  'a{border-top-width:1px;border-top-style:solid;border-top-color:red}',
  'a{font-weight:700;font-weight:700}',
  'a{margin:0;margin-top:1px;margin-left:2px}',
];

for (const css of blocks) {
  test(`canonicalizing ${css} twice gives the same output as once`, () => {
    const once = canonicalizeBlocks(css);
    assert.strictEqual(canonicalizeBlocks(once), once);
  });

  test(`canonicalizing ${css} never makes it longer`, () => {
    assert.ok(canonicalizeBlocks(css).length <= css.length);
  });

  test(`canonicalizing ${css} keeps its rule count`, () => {
    assert.strictEqual(ruleCount(canonicalizeBlocks(css)), ruleCount(css));
  });
}
