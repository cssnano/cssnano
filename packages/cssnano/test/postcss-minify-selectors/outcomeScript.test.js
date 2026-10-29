import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  countFoldLists,
  countOutcomes,
} from '../../script/postcss-minify-selectors/outcomes.js';

// One selector per outcome row, plus a second list of two selectors that
// folds, so every row and the fold counts are non-zero.
const fixture = [
  '.a:hover', // skipped: fixed-point check rejects the pseudo-class
  '.b .c', // skipped: fixed-point check accepts the descendant combinator
  '.d > .e', // changed: whitespace only
  '.f,.g', // unchanged: sorted already, no whitespace to remove
  '.h,.i .j,.k', // unchanged: no fold, sorted
  'a[href="x"]', // changed: attribute quotes are rewritten
  '.y,.x', // changed: sort only
];

test('the outcome script rows add up to the distinct selectors it reads', () => {
  const result = countOutcomes(fixture);
  const rows =
    result.skipped +
    result.unchanged +
    result.whitespace +
    result.sortOrDedupe +
    result.other;
  assert.equal(rows, new Set(fixture).size);
});

test('the outcome script classifies a whitespace-only change apart from a sort', () => {
  const result = countOutcomes(['.d > .e', '.y,.x']);
  assert.equal(result.whitespace, 1);
  assert.equal(result.sortOrDedupe, 1);
});

test('the outcome script counts a selector list that folds', () => {
  const result = countFoldLists(['.a .btn:hover,.b .btn:hover', '.z']);
  assert.equal(result.lists, 1);
  assert.equal(result.reaching, 1);
  assert.equal(result.folding, 1);
});
