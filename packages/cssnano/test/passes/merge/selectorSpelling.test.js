import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { mergePass } from '../../../src/passes/merge/index.js';
import { resolveTargets } from '../../../src/utils/browserTargets.js';

/**
 * Runs the merge pass over one stylesheet with the default targets.
 *
 * @param {string} css
 * @return {string}
 */
function mergedCss(css) {
  const root = postcss.parse(css);
  mergePass(root, resolveTargets({}, undefined));
  return root.toString();
}

test('a merged rule writes its selectors joined by bare commas, whatever the spacing of the source', () => {
  for (const selector of ['a, b', 'a,b', 'a /* x */, b']) {
    assert.equal(
      mergedCss(`${selector}{color:red}c{color:red}`),
      'a,b,c{color:red}',
      selector
    );
  }
});

test('a merged rule writes a selector whose comment PostCSS dropped as its item', () => {
  assert.equal(
    mergedCss('a /**/ .b{color:red}c{color:red}'),
    'a  .b,c{color:red}'
  );
});

test('an empty selector item keeps its place, since its rule does not merge', () => {
  assert.equal(
    mergedCss('a,,b{color:red}c{color:red}'),
    'a,,b{color:red}c{color:red}'
  );
});

test('a selector that is incompatible in one rule is incompatible in another rule at a different offset', () => {
  assert.equal(
    mergedCss('c{color:red}::-moz-placeholder{color:red}'),
    'c{color:red}::-moz-placeholder{color:red}'
  );
  assert.equal(
    mergedCss('c{color:red}a,::-moz-placeholder{color:red}'),
    'c{color:red}a,::-moz-placeholder{color:red}'
  );
});

test('PostCSS keeps a comment that directly follows a token of its selector item', () => {
  assert.deepEqual(postcss.parse('a/**/.b{}').first.selectors, ['a/**/.b']);
});

test('PostCSS drops a comment that has whitespace beside it', () => {
  assert.deepEqual(postcss.parse('a /**/ .b{}').first.selectors, ['a  .b']);
});

test('PostCSS drops a comment that starts a selector item', () => {
  assert.deepEqual(postcss.parse('a,/**/b{}').first.selectors, ['a', 'b']);
});

test('PostCSS keeps a comment that directly follows a selector item with a comma', () => {
  assert.deepEqual(postcss.parse('a/**/,b{}').first.selectors, ['a/**/', 'b']);
});
