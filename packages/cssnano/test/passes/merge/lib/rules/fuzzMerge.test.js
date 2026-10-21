import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkMergePair } from '../../../../../script/passes/merge/rules/fuzzMerge.js';

test('a pair whose computed border width changes is reported with the changed longhand', () => {
  assert.match(
    checkMergePair('p{border-top-width:1px}', {
      css: 'p{border-top-width:2px}',
    })?.detail ?? '',
    /border-top-width/v
  );
});

test('a pair with the same computed styles is not reported', () => {
  assert.equal(
    checkMergePair('p{border-top-width:1px;border-top-style:solid}', {
      css: 'p{border-top:1px solid}',
    }),
    undefined
  );
});

test('an input that the plugin never finishes is reported as not terminating', () => {
  assert.equal(
    checkMergePair('p{margin:0}', { css: undefined })?.reason,
    'did not terminate'
  );
});
