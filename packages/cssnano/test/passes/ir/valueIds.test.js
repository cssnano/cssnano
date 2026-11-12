import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TokenLists } from '../../../src/passes/ir/tokenLists.js';
import { ValueIds } from '../../../src/passes/ir/valueIds.js';
import { tokenizeMode } from '../../../src/values/tokenizeMode.js';
import { tokens as tokenize } from '../../../src/utils/value.js';

test('equal text in the same mode gets one id, and a second use pushes no list', () => {
  const lists = new TokenLists();
  const ids = new ValueIds();
  const first = ids.idOf(lists, undefined, '0 0', undefined);
  const pushed = lists.length;
  assert.equal(ids.idOf(lists, undefined, '0 0', undefined), first);
  assert.equal(lists.length, pushed);
});

test('the same text in the default and the unicode-range modes gets two ids', () => {
  const lists = new TokenLists();
  const ids = new ValueIds();
  const range = tokenizeMode('unicode-range');
  assert.notEqual(
    ids.idOf(lists, undefined, 'U+0025-00FF', undefined),
    ids.idOf(lists, range, 'U+0025-00FF', undefined)
  );
});

test('a unicode-range value under its mode is one range token', () => {
  const lists = new TokenLists();
  const ids = new ValueIds();
  const id = ids.idOf(
    lists,
    tokenizeMode('unicode-range'),
    'U+0025-00FF',
    undefined
  );
  assert.equal(lists.get(id).length, 1);
});

test('a list supplied for a new text is the one the id points at', () => {
  const lists = new TokenLists();
  const ids = new ValueIds();
  const supplied = tokenize('10px');
  const id = ids.idOf(lists, undefined, '10px', supplied);
  assert.equal(lists.get(id), supplied);
});

test('a list supplied for a text already interned is dropped, so the first list stays', () => {
  const lists = new TokenLists();
  const ids = new ValueIds();
  const first = ids.idOf(lists, undefined, '10px', tokenize('10px'));
  const later = tokenize('10px');
  assert.equal(ids.idOf(lists, undefined, '10px', later), first);
  assert.notEqual(lists.get(first), later);
});

test('an id is found by the text and mode of a list in the run that interned it', () => {
  const lists = new TokenLists();
  const ids = new ValueIds();
  const id = ids.idOf(lists, undefined, 'a\\31 b', undefined);
  assert.equal(lists.textLength(id), 'a\\31 b'.length);
});
