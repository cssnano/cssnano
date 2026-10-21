import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import preset from '../../../src/presets/default.js';
import { repositoryFile } from '../../../../../util/testHelpers.js';
import { mergeOracleDifference } from '../../../script/passes/merge/rules/lib/mergeOracle.js';

/**
 * @param {string} css
 * @param {string[]} disable
 * @return {Promise<string>}
 */
async function minify(css, disable) {
  const result = await postcss(preset({ disable })).process(css, {
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

test('with mergeRules off, discardDuplicates removes the earlier of two equal rules', async () => {
  const css = 'a{color:red}b{color:blue}a{color:red}';
  const output = await minify(css, ['mergeRules']);

  assert.equal(output, 'b{color:blue}a{color:red}');
  assertSameStyles(css, output);
});

test('with mergeRules and discardDuplicates off, equal rules around another rule are kept', async () => {
  const css = 'a{color:red}b{color:blue}a{color:red}';
  const output = await minify(css, ['mergeRules', 'discardDuplicates']);

  assert.equal(output, 'a{color:red}b{color:blue}a{color:red}');
  assertSameStyles(css, output);
});

test('with discardDuplicates off, a repeated rule after a different rule is kept', async () => {
  const css = '.a{color:red}.b{color:blue}.a{color:red}';
  const output = await minify(css, ['discardDuplicates']);

  assert.equal(output, '.a{color:red}.b{color:blue}.a{color:red}');
  assertSameStyles(css, output);
});

test('with mergeLonghand off, four margin longhands are not folded into margin', async () => {
  const css =
    'a{margin-top:1px;margin-right:1px;margin-bottom:1px;margin-left:1px}';
  const output = await minify(css, ['mergeLonghand']);

  assert.equal(output, css);
  assertSameStyles(css, output);
});

test('with mergeRules off, two rules with the same declaration are not joined', async () => {
  const css = 'a{color:red}b{color:red}';
  const output = await minify(css, ['mergeRules']);

  assert.equal(output, 'a{color:red}b{color:red}');
  assertSameStyles(css, output);
});

test('with mergeLonghand off, mergeRules still joins rules whose margins are not folded', async () => {
  const css =
    'a{margin-top:1px;margin-right:1px;margin-bottom:1px;margin-left:1px}b{margin-top:1px;margin-right:1px;margin-bottom:1px;margin-left:1px}';
  const output = await minify(css, ['mergeLonghand']);

  assert.equal(
    output,
    'a,b{margin-top:1px;margin-right:1px;margin-bottom:1px;margin-left:1px}'
  );
  assertSameStyles(css, output);
});

test('with mergeRules off, mergeLonghand still folds the margins of each rule', async () => {
  const css =
    'a{margin-top:1px;margin-right:1px;margin-bottom:1px;margin-left:1px}b{margin-top:1px;margin-right:1px;margin-bottom:1px;margin-left:1px}';
  const output = await minify(css, ['mergeRules']);

  assert.equal(output, 'a{margin:1px}b{margin:1px}');
  assertSameStyles(css, output);
});

test('with mergeLonghand and mergeRules off, discardDuplicates still removes the earlier of two equal rules', async () => {
  const css = 'a{color:red}b{color:blue}a{color:red}';
  const output = await minify(css, ['mergeLonghand', 'mergeRules']);

  assert.equal(output, 'b{color:blue}a{color:red}');
  assertSameStyles(css, output);
});

test('with mergeLonghand and mergeRules off, margin longhands are not folded and equal rules are not joined', async () => {
  const css =
    'a{margin-top:1px;margin-right:1px;margin-bottom:1px;margin-left:1px}b{margin-top:1px;margin-right:1px;margin-bottom:1px;margin-left:1px}';
  const output = await minify(css, ['mergeLonghand', 'mergeRules']);

  assert.equal(output, css);
  assertSameStyles(css, output);
});
