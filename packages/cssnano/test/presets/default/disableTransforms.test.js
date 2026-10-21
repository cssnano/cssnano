import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import preset from '../../../src/presets/default.js';
import { repositoryFile } from '../../../../../util/testHelpers.js';
import { mergeOracleDifference } from '../../../script/passes/merge/rules/lib/mergeOracle.js';

/**
 * @param {string} css
 * @param {object} options the preset options
 * @return {Promise<string>}
 */
async function minify(css, options) {
  const result = await postcss(preset(options)).process(css, {
    from: repositoryFile,
  });
  return result.css;
}

/**
 * Throws unless every element computes the same styles before and after.
 *
 * @param {string} before
 * @param {string} after
 */
function assertSameStyles(before, after) {
  assert.equal(mergeOracleDifference(before, after), undefined);
}

const marginLonghands =
  'a{margin-top:1px;margin-right:1px;margin-bottom:1px;margin-left:1px}';

test('disable merge keeps four margin longhands unfolded, because the merge pass does not run', async () => {
  const output = await minify(marginLonghands, { disable: ['merge'] });

  assert.equal(output, marginLonghands);
  assertSameStyles(marginLonghands, output);
});

test('disable merge keeps two rules with the same declaration apart', async () => {
  const css = 'a{color:red}b{color:red}';
  const output = await minify(css, { disable: ['merge'] });

  assert.equal(output, css);
  assertSameStyles(css, output);
});

test('disable merge keeps the earlier of two equal rules, since discarding duplicates is part of merge', async () => {
  const css = 'a{color:red}b{color:blue}a{color:red}';
  const output = await minify(css, { disable: ['merge'] });

  assert.equal(output, css);
  assertSameStyles(css, output);
});

test('merge with rules false still folds four margin longhands into margin', async () => {
  const output = await minify(marginLonghands, {
    options: { merge: { rules: false } },
  });

  assert.equal(output, 'a{margin:1px}');
  assertSameStyles(marginLonghands, output);
});

test('merge with rules false removes the earlier of two equal rules', async () => {
  const css = 'a{color:red}b{color:blue}a{color:red}';
  const output = await minify(css, {
    options: { merge: { rules: false } },
  });

  assert.equal(output, 'b{color:blue}a{color:red}');
  assertSameStyles(css, output);
});

test('merge with rules false does not join two rules with the same declaration', async () => {
  const css = 'a{color:red}b{color:red}';
  const output = await minify(css, {
    options: { merge: { rules: false } },
  });

  assert.equal(output, css);
  assertSameStyles(css, output);
});
