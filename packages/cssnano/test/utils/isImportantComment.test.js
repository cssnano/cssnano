import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokens } from '../../src/utils/value.js';
import isImportantComment, {
  isImportantCommentToken,
} from '../../src/utils/isImportantComment.js';

test('isImportantComment should accept comment text starting with an exclamation mark', () => {
  assert.strictEqual(isImportantComment('! license'), true);
});

test('isImportantComment should reject an ordinary comment', () => {
  assert.strictEqual(isImportantComment(' license'), false);
});

test('isImportantComment should reject an exclamation mark that is not first because only a leading one marks the comment', () => {
  assert.strictEqual(isImportantComment(' ! license'), false);
});

test('isImportantCommentToken should accept a comment token starting with an exclamation mark', () => {
  assert.equal(isImportantCommentToken(tokens('/*! license */')[0]), true);
});

test('isImportantCommentToken should reject an ordinary comment token', () => {
  assert.equal(isImportantCommentToken(tokens('/* license */')[0]), false);
});

test('isImportantCommentToken should reject a non-comment token whose text starts with the marker', () => {
  assert.equal(isImportantCommentToken(tokens('"/*!"')[0]), false);
});
