import assert from 'node:assert/strict';
import { test } from 'node:test';
import cssnanoUtils from '#utils';
import { selectorRanges } from '../../src/values/selectorRanges.js';
import { tokensText } from '../../src/values/tokensText.js';
import { normalizeArena } from '../../src/plugins/postcss-minify-selectors/lib/normalizeArena.js';
import { parseSelectorArena } from '../../src/plugins/postcss-minify-selectors/lib/parseArena.js';
import {
  serializeNormalized,
  serializeNormalizedTokens,
} from '../../src/plugins/postcss-minify-selectors/lib/serializeArena.js';

const { tokens } = cssnanoUtils;

/** The serialized normal form of a selector list, from its own text. */
function serializedOwnText(text) {
  const arena = parseSelectorArena(text, { verifyArena: false });
  return serializeNormalized(
    arena,
    normalizeArena(arena, { sort: true, convertToIs: true })
  );
}

test("parseSelectorArena over a selector's range of its rule's tokens serializes as over the selector's own text", () => {
  const rules = [
    '.a, .b',
    '.a /* c */ .b, x',
    '.x,\n  :is(.a, .b)  , c',
    'a + b , .c>.d',
    '[title="a,b"] ,.\\31 x, h1 /*! keep */',
  ];
  for (const rule of rules) {
    const list = tokens(rule);
    for (const range of selectorRanges(list)) {
      const { start, end } = range;
      const own = tokensText(list.slice(start, end));
      const arena = parseSelectorArena(
        rule,
        { verifyArena: true },
        list,
        start,
        end
      );
      const root = normalizeArena(arena, { sort: true, convertToIs: true });
      const text = serializeNormalized(arena, root);
      assert.equal(text, serializedOwnText(own), rule);
      assert.deepEqual(
        serializeNormalizedTokens(arena, root).tokens,
        tokens(text),
        rule
      );
    }
  }
});
