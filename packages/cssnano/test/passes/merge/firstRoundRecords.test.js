// Guards for the first longhand round when it reads and writes the records:
// an important comment is kept in a block that the round also edits, and a
// rewrite in a block no removal touched is written back. These pass on the
// node round and must keep passing once the round runs on the records.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { mergePass, transformPlugin } from '../../../src/passes/merge/index.js';
import { resolveTargets } from '../../../src/utils/browserTargets.js';

/**
 * @param {string} css
 * @return {Promise<string>} the output of the first longhand round alone
 */
async function firstRoundOf(css) {
  const result = await postcss([transformPlugin('mergeLonghand')({})]).process(
    css,
    { from: undefined }
  );
  return result.css;
}

test('the first round writes back a shorthand it rewrote in a rule that no removal touched', async () => {
  assert.equal(
    await firstRoundOf('a{margin:1px 1px 1px 1px}'),
    'a{margin:1px}'
  );
});

test('the first round folds the longhands of a block and keeps the declaration with an important comment as written', async () => {
  assert.equal(
    await firstRoundOf(
      'a{padding-top:1px;padding-right:1px;padding-bottom:1px;padding-left:1px;margin-top:1px/*! keep */;margin-right:1px;margin-bottom:1px;margin-left:1px}'
    ),
    'a{padding:1px;margin-top:1px/*! keep */;margin-right:1px;margin-bottom:1px;margin-left:1px}'
  );
});

test('the first round removes the longhands that a kept shorthand overrides, and keeps the shorthand as written', async () => {
  assert.equal(
    await firstRoundOf(
      'a{padding-top:1px;padding-right:1px;padding-bottom:1px;padding-left:1px;margin-top:1px;margin-right:1px;margin-bottom:1px;margin-left:1px;margin:2px/*! keep */}'
    ),
    'a{padding:1px;margin:2px/*! keep */}'
  );
});

test('the first round keeps a longhand with an important comment after the margins it does not join', async () => {
  assert.equal(
    await firstRoundOf(
      'a{margin-top:1px;margin-right:1px;margin-bottom:1px;margin-left:1px;padding-top:1px/*! keep */}'
    ),
    'a{margin:1px;padding-top:1px/*! keep */}'
  );
});

test('the merge pass under consistency checks accepts a first-round rewrite and clone, and merges the rules that the rewrite leaves equal', () => {
  const root = postcss.parse(
    'a{margin-top:1px;margin-right:1px;margin-bottom:1px;margin-left:1px}b{margin:1px 1px 1px 1px}'
  );
  mergePass(
    root,
    resolveTargets({}, undefined),
    {},
    undefined,
    undefined,
    true
  );
  assert.equal(root.toString(), 'a,b{margin:1px}');
});
