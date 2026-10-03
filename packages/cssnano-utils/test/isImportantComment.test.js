import { test } from 'node:test';
import assert from 'node:assert/strict';
import isImportantComment from '../src/isImportantComment.js';

test('isImportantComment should accept comment text starting with an exclamation mark', () => {
  assert.strictEqual(isImportantComment('! license'), true);
});

test('isImportantComment should reject an ordinary comment', () => {
  assert.strictEqual(isImportantComment(' license'), false);
});

test('isImportantComment should reject an exclamation mark that is not first because only a leading one marks the comment', () => {
  assert.strictEqual(isImportantComment(' ! license'), false);
});
