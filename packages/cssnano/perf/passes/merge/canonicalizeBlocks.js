import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import postcss from 'postcss';
import {
  canonicalize,
  finishColumns,
  longhandContext,
} from '../../../src/passes/merge/lib/longhand/canonicalize.js';
import { withTargetSupport } from '../../../src/passes/merge/lib/longhand/isFallback.js';
import { clearSupportCache } from '../../../src/passes/merge/lib/longhand/syntaxFeatures.js';
import { targetSupportOf } from '../../../src/passes/merge/lib/longhand/targetSupport.js';
import { minifiedLength } from '../../../src/passes/ir/minifiedLength.js';
import { resolveTargets } from '../../../src/utils/browserTargets.js';

const fixtures = new URL('../../../../../frameworks/', import.meta.url);
const browsers = resolveTargets({}, undefined);

/**
 * The minified bytes of the declarations a block sets.
 *
 * @param {import('postcss').Container} block
 * @return {number}
 */
function blockLength(block) {
  let total = 0;
  for (const child of block.nodes) {
    if (child.type === 'decl') total += minifiedLength(child);
  }
  return total;
}

// A block that canonicalizes again must not change, and one canonicalization
// must never make a block longer. Both are checked over the framework fixtures,
// with one context shared by the two calls, as the merge pass shares it.
test('canonicalizing a framework block twice gives the same block and never a longer one', () => {
  const { placeShorthands, boxSupport, pairShorthands, features } =
    targetSupportOf(browsers);
  for (const file of readdirSync(fixtures)) {
    if (!file.endsWith('.css')) continue;
    const root = postcss.parse(readFileSync(new URL(file, fixtures), 'utf8'));
    const context = longhandContext(
      placeShorthands,
      boxSupport,
      pairShorthands
    );
    try {
      withTargetSupport(features, () => {
        canonicalize(root, context);
        /** @type {import('postcss').Container[]} */
        const blocks = [];
        root.walk((node) => {
          if (node.type !== 'rule' && node.type !== 'atrule') return;
          if (node.nodes?.some((child) => child.type === 'decl')) {
            blocks.push(node);
          }
        });
        const lengthsBefore = blocks.map(blockLength);
        for (const block of blocks) canonicalize(block, context);
        finishColumns(context);
        const once = blocks.map((block) => block.toString());
        const lengthsOnce = blocks.map(blockLength);
        for (const [index, length] of lengthsOnce.entries()) {
          assert.ok(
            length <= lengthsBefore[index],
            `${file}: canonicalization made a block longer`
          );
        }
        for (const block of blocks) canonicalize(block, context);
        finishColumns(context);
        for (const [index, block] of blocks.entries()) {
          assert.strictEqual(
            block.toString(),
            once[index],
            `${file}: a second canonicalization changed a block`
          );
        }
      });
    } finally {
      clearSupportCache();
    }
  }
});
