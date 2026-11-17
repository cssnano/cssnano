import { createRunContext } from '../../src/run/runContext.js';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import postcss from 'postcss';
import { buildRecords } from '../../src/ir/tree/buildRecords.js';
import { writeBack } from '../../src/ir/tree/writeBack.js';
import {
  canonicalizeRecords,
  LonghandRound,
} from '../../src/merge/longhand/canonicalize.js';
import { targetSupportOf } from '../../src/merge/longhand/targetSupport.js';
import { resolveTargets } from '../../src/utils/browserTargets.js';
import { testTargets } from '../../../../util/testHelpers.js';

const fixtures = new URL('../../../../frameworks/', import.meta.url);
const browsers = resolveTargets({ query: testTargets }, undefined);

/**
 * One longhand round on the records of a stylesheet, written back to its text.
 *
 * @param {string} css
 * @return {string}
 */
function roundOf(css) {
  const root = postcss.parse(css);
  const { placeShorthands, boxSupport, pairShorthands, features } =
    targetSupportOf(browsers);
  const run = createRunContext(undefined, features);
  const { records, nodes } = buildRecords(root, run);
  canonicalizeRecords(
    records,
    new LonghandRound(placeShorthands, boxSupport, pairShorthands, run)
  );
  writeBack(records, nodes, run.tokenLists);
  return root.toString();
}

// A stylesheet that goes through the round again must not change, and one round
// must never make it longer. Both are checked over the framework fixtures.
test('a longhand round over a framework fixture gives the same text when it runs again, and never a longer one', () => {
  for (const file of readdirSync(fixtures)) {
    if (!file.endsWith('.css')) continue;
    const css = readFileSync(new URL(file, fixtures), 'utf8');
    const once = roundOf(css);
    assert.ok(once.length <= css.length, `${file}: the round made it longer`);
    assert.strictEqual(
      roundOf(once),
      once,
      `${file}: a second round changed it`
    );
  }
});
