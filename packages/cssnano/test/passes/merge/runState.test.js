import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { mergePass } from '../../../src/passes/merge/index.js';

// `5dvh` needs support that the older target lacks, so whether `2em` is a
// fallback depends on the targets.
const css = 'a{width:2em;width:5dvh}b{width:2em;width:5dvh}';
const oldTargets = ['chrome 50'];
const newTargets = ['chrome 120'];

/**
 * @param {string} source
 * @param {readonly string[]} browsers
 * @returns {string}
 */
function mergeWith(source, browsers) {
  const root = postcss.parse(source);
  mergePass(root, browsers);
  return root.toString();
}

test('merge over one stylesheet per target matches a fresh run for each target, in either order', () => {
  const freshOld = mergeWith(css, oldTargets);
  const freshNew = mergeWith(css, newTargets);
  assert.notEqual(freshOld, freshNew, 'the targets must change the output');

  assert.equal(mergeWith(css, oldTargets), freshOld);
  assert.equal(mergeWith(css, newTargets), freshNew);
  assert.equal(mergeWith(css, oldTargets), freshOld);
});

test('merge over a stylesheet that throws leaves no run state behind, so the next run matches a fresh one', () => {
  const expected = mergeWith(css, newTargets);

  const root = postcss.parse('a{color:red}b{color:red}');
  // Reading the value throws after the run has attached its block table.
  const [decl] = /** @type {import('postcss').Rule} */ (root.first).nodes ?? [];
  Object.defineProperty(decl, 'value', {
    get() {
      throw new Error('value read failed');
    },
  });
  assert.throws(() => mergePass(root, newTargets), {
    message: 'value read failed',
  });

  assert.equal(mergeWith(css, newTargets), expected);
});
