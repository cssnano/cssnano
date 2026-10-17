import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  resolveTargets,
  sharedTargetListLimit,
} from '../../src/utils/browserTargets.js';

/** @param {string[]} list */
function resolveList(list) {
  const browserslist = Object.assign(() => list, {
    loadConfig: () => undefined,
  });
  return resolveTargets({}, { opts: {}, warn() {} }, browserslist);
}

/** @param {number} count @param {string} tag */
function resolveOthers(count, tag) {
  for (let index = 0; index < count; index += 1) {
    resolveList([`chrome ${tag}${index}`]);
  }
}

test('forgets a list after enough other lists, so a long-running process keeps a bounded number', () => {
  const first = resolveList(['firefox 140', 'safari 26']);
  resolveOthers(sharedTargetListLimit, 'a');
  assert.notEqual(resolveList(['firefox 140', 'safari 26']), first);
});

test('keeps sharing a list that files keep resolving while other lists come and go', () => {
  const first = resolveList(['firefox 141', 'safari 26']);
  resolveOthers(sharedTargetListLimit - 1, 'b');
  resolveList(['firefox 141', 'safari 26']);
  resolveOthers(sharedTargetListLimit - 1, 'c');
  assert.equal(resolveList(['firefox 141', 'safari 26']), first);
});
