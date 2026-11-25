import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseSelectorArena } from '../../src/plugins/postcss-minify-selectors/lib/parseArena.js';
import { normalizeNode } from '../../src/plugins/postcss-minify-selectors/lib/normalizeNode.js';
import {
  OutputPool,
  outputText,
} from '../../src/plugins/postcss-minify-selectors/lib/normalizePool.js';
import { foldSelectors } from '../../src/plugins/postcss-minify-selectors/lib/normalizeFoldWork.js';

/**
 * The root list's entries and pool, built the way normalizeArena builds them.
 * @param {string} source
 */
function rootEntries(source) {
  const arena = parseSelectorArena(source, {});
  const pool = new OutputPool(arena);
  const normalized = Array(arena.nodes.length);
  for (let index = arena.nodes.length - 1; index >= 0; index--) {
    normalized[index] = normalizeNode(arena, pool, index, normalized, false);
    arena.forEachChild(index, (child) => {
      normalized[child] = undefined;
    });
  }
  return { arena, pool, entries: normalized[0].entries };
}

test('re-folding a list that lost its last selector drops the removed selector from the walk', () => {
  const { arena, pool, entries } = rootEntries('.a .x,.b .y,.c .z');
  const kept = foldSelectors(arena, pool, entries, false).slice(0, -1);
  const texts = foldSelectors(arena, pool, kept, false).map((selector) =>
    outputText(pool, selector)
  );
  assert.deepEqual(
    texts,
    kept.map((selector) => outputText(pool, selector))
  );
});
