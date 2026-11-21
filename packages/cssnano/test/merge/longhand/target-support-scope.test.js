import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import { onlyTransform } from '../onlyTransform.js';
import { isFallback } from '../../../src/merge/longhand/isFallback.js';
import { longstandingFeatures } from '../../../src/run/syntaxFeatures.js';
import { itemOf } from './helpers/declarationItems.js';

// `margin:5dvh` needs a feature only modern browsers parse, so whether the
// `margin:1px` before it is a fallback depends on the targets.
const css = 'a{margin:1px;margin:5dvh}';
const modern = ['chrome 120', 'firefox 120', 'safari 17'];
const defaults = ['defaults'];

/**
 * Runs the longhand merge over the stylesheet with the targets, in one run.
 *
 * @param {import('postcss').Root} root
 * @param {readonly string[]} browsers
 * @return {import('postcss').Root}
 */
function runLonghand(root, browsers) {
  const plugin = onlyTransform(['mergeLonghand'])({
    browserslist: { query: browsers },
  });
  return postcss([plugin]).process(root, { from: undefined }).root;
}

/**
 * @param {readonly string[]} browsers
 * @return {string}
 */
function mergeLonghand(browsers) {
  return runLonghand(postcss.parse(css), browsers).toString();
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
    assert.throws(() => runLonghand(root, modern), /unreadable stylesheet/v);
    assert.equal(mergeLonghand(defaults), css);
    assert.equal(mergeLonghand(modern), 'a{margin:5dvh}');
  });
});

describe('isFallback called without a run', () => {
  test('keeps an earlier declaration that the strict default lacks support for', () => {
    const earlier = itemOf('margin: 1px');
    const later = itemOf('margin: 5dvh');
    assert.equal(isFallback(earlier, later, longstandingFeatures), true);
  });
});
