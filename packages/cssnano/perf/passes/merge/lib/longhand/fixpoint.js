import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import postcss from 'postcss';
import { mergePass } from '../../../../../src/passes/merge/index.js';
import { resolveTargets } from '../../../../../src/utils/browserTargets.js';

const fixtures = new URL('../../../../../../../frameworks/', import.meta.url);

/**
 * @param {string} css
 * @return {string}
 */
function mergeOnce(css) {
  const root = postcss.parse(css);
  mergePass(root, resolveTargets({}, undefined));
  return root.toString();
}

// One merge pass over its own output should find nothing to save. A saving
// here would mean a block the first pass left unchanged still canonicalizes.
test('a second merge pass over the framework fixtures saves nothing', () => {
  let saved = 0;
  for (const file of readdirSync(fixtures)) {
    if (!file.endsWith('.css')) continue;
    const css = readFileSync(new URL(file, fixtures), 'utf8');
    const first = mergeOnce(css);
    const second = mergeOnce(first);
    const gain = first.length - second.length;
    if (gain !== 0) console.log(`${file}: a second sweep saves ${gain} bytes`);
    saved += gain;
  }
  assert.equal(saved, 0);
});
