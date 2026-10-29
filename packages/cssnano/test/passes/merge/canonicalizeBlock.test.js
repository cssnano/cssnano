import { test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import {
  canonicalize,
  finishColumns,
  longhandContext,
} from '../../../src/passes/merge/lib/longhand/canonicalize.js';
import { TextTable } from '../../../src/values/textTable.js';
import { withTargetSupport } from '../../../src/passes/merge/lib/longhand/isFallback.js';
import { clearSupportCache } from '../../../src/passes/merge/lib/longhand/syntaxFeatures.js';
import { targetSupportOf } from '../../../src/passes/merge/lib/longhand/targetSupport.js';
import { resolveTargets } from '#utils/browser-targets';

const browsers = resolveTargets({}, { opts: { from: 'block.css' } });

/**
 * Canonicalizes every declaration block of `css` with one context, then runs
 * the column step, the way the merge pass does in its first round, and returns
 * the stylesheet text.
 *
 * @param {string} css
 * @return {string}
 */
function canonicalizeBlocks(css) {
  const root = postcss.parse(css);
  const { placeShorthands, boxSupport, pairShorthands, features } =
    targetSupportOf(browsers);
  const context = longhandContext(
    placeShorthands,
    boxSupport,
    pairShorthands,
    new TextTable()
  );
  try {
    withTargetSupport(features, () => {
      canonicalize(root, context);
      root.walk((node) => {
        if (node.type !== 'rule' && node.type !== 'atrule') return;
        if (!node.nodes?.some((child) => child.type === 'decl')) return;
        canonicalize(node, context);
      });
      finishColumns(context);
    });
  } finally {
    clearSupportCache();
  }
  return root.toString();
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
