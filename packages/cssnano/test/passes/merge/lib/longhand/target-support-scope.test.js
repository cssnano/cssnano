import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import { transformPass } from '../../../../../src/passes/merge/index.js';
import { isFallback } from '../../../../../src/passes/merge/lib/longhand/isFallback.js';
import { longstandingFeatures } from '../../../../../src/passes/merge/lib/longhand/syntaxFeatures.js';
import { TextTable } from '../../../../../src/values/textTable.js';

// `margin:5dvh` needs a feature only modern browsers parse, so whether the
// `margin:1px` before it is a fallback depends on the targets.
const css = 'a{margin:1px;margin:5dvh}';
const modern = ['chrome 120', 'firefox 120', 'safari 17'];
const defaults = ['defaults'];

/**
 * @param {readonly string[]} browsers
 * @return {string}
 */
function mergeLonghand(browsers) {
  const root = postcss.parse(css);
  transformPass('mergeLonghand')(root, browsers);
  return root.toString();
}

describe('the target support of one run', () => {
  test('two stylesheets in one process with different targets each keep their own result', () => {
    assert.equal(mergeLonghand(modern), 'a{margin:5dvh}');
    assert.equal(mergeLonghand(defaults), css);
  });

  test('a run after a run that throws inside the targets keeps the targets of its own run', () => {
    // The first read of the stylesheet throws once the longhand round is under way.
    const root = postcss.parse(css);
    Object.defineProperty(root, 'nodes', {
      get() {
        throw new Error('unreadable stylesheet');
      },
    });
    assert.throws(
      () => transformPass('mergeLonghand')(root, modern),
      /unreadable stylesheet/v
    );
    assert.equal(mergeLonghand(defaults), css);
    assert.equal(mergeLonghand(modern), 'a{margin:5dvh}');
  });
});

describe('isFallback called without a run', () => {
  test('keeps an earlier declaration that the strict default lacks support for', () => {
    const textTable = new TextTable();
    const earlier = postcss.parse('a{margin:1px}').first.first;
    const later = postcss.parse('a{margin:5dvh}').first.first;
    assert.equal(
      isFallback(earlier, later, textTable, longstandingFeatures),
      true
    );
  });
});
