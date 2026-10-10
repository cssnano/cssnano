import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dropHexEscapeTerminator,
  hexEscapeDigitCount,
  joinPieces,
  needsHexEscapeTerminator,
  needsTerminatorAfterDigits,
} from '../src/lib/hexEscape.js';

test('hexEscapeDigitCount counts the digits of an escape ending at the offset', () => {
  assert.equal(hexEscapeDigitCount('a\\61', 4), 2);
  assert.equal(hexEscapeDigitCount('\\1F600', 6), 5);
});

test('hexEscapeDigitCount caps the digits at six', () => {
  assert.equal(hexEscapeDigitCount('\\0000610', 8), 0);
  assert.equal(hexEscapeDigitCount('\\000061', 7), 6);
});

test('hexEscapeDigitCount ignores digits after an escaped backslash', () => {
  assert.equal(hexEscapeDigitCount('\\\\61', 4), 0);
  assert.equal(hexEscapeDigitCount('\\\\\\61', 5), 2);
});

test('hexEscapeDigitCount ignores hex digits without a backslash', () => {
  assert.equal(hexEscapeDigitCount('abc', 3), 0);
  assert.equal(hexEscapeDigitCount('', 0), 0);
});

test('hexEscapeDigitCount reports no escape when the offset follows a non-digit', () => {
  assert.equal(hexEscapeDigitCount('\\61 ', 4), 0);
});

test('dropHexEscapeTerminator removes the space after a hex escape at the end', () => {
  assert.equal(dropHexEscapeTerminator('a\\61 '), 'a\\61');
});

test('dropHexEscapeTerminator removes the space before a non-hex character', () => {
  assert.equal(dropHexEscapeTerminator('\\61 g'), '\\61g');
});

test('dropHexEscapeTerminator keeps the space before a hex digit that would extend the escape', () => {
  assert.equal(dropHexEscapeTerminator('\\61 b'), '\\61 b');
});

test('dropHexEscapeTerminator keeps the space before another whitespace', () => {
  assert.equal(dropHexEscapeTerminator('\\61  g'), '\\61  g');
});

test('dropHexEscapeTerminator removes a CRLF terminator as one whitespace', () => {
  assert.equal(dropHexEscapeTerminator('\\61\r\ng'), '\\61g');
});

test('dropHexEscapeTerminator keeps an escaped space because it is the escaped character', () => {
  assert.equal(dropHexEscapeTerminator('a\\ '), 'a\\ ');
});

test('dropHexEscapeTerminator keeps a space after literal digits following an escaped backslash', () => {
  assert.equal(dropHexEscapeTerminator('\\\\61 '), '\\\\61 ');
});

test('dropHexEscapeTerminator returns the same string when there is no backslash', () => {
  assert.equal(dropHexEscapeTerminator('a b'), 'a b');
});

test('needsHexEscapeTerminator requires a terminator before whitespace', () => {
  assert.equal(needsHexEscapeTerminator('\\61', ' '), true);
});

test('needsHexEscapeTerminator requires a terminator before a hex digit when the escape has fewer than six digits', () => {
  assert.equal(needsHexEscapeTerminator('\\61', 'b'), true);
});

test('needsHexEscapeTerminator needs no terminator before a hex digit after six digits', () => {
  assert.equal(needsHexEscapeTerminator('\\000061', 'b'), false);
});

test('needsHexEscapeTerminator requires a terminator before whitespace even after six digits', () => {
  assert.equal(needsHexEscapeTerminator('\\000061', ' '), true);
});

test('needsHexEscapeTerminator needs no terminator before a non-hex character', () => {
  assert.equal(needsHexEscapeTerminator('\\61', 'g'), false);
});

test('needsHexEscapeTerminator needs no terminator when the first piece is not a hex escape', () => {
  assert.equal(needsHexEscapeTerminator('a', 'b'), false);
  assert.equal(needsHexEscapeTerminator('', 'b'), false);
});

test('needsHexEscapeTerminator needs no terminator before an empty piece', () => {
  assert.equal(needsHexEscapeTerminator('\\61', ''), false);
});

test('needsTerminatorAfterDigits agrees with needsHexEscapeTerminator', () => {
  for (const before of ['', 'a', '\\6', '\\61', '\\000061', '\\\\61']) {
    for (const after of ['', 'b', 'g', ' ', '\n']) {
      assert.equal(
        needsTerminatorAfterDigits(
          hexEscapeDigitCount(before, before.length),
          after.charCodeAt(0)
        ),
        needsHexEscapeTerminator(before, after),
        JSON.stringify([before, after])
      );
    }
  }
});

test('joinPieces restores the terminators that dropHexEscapeTerminator removed', () => {
  assert.equal(joinPieces(['\\61', 'b']), '\\61 b');
});

test('joinPieces concatenates pieces without a terminator when none is needed', () => {
  assert.equal(joinPieces(['\\61', 'g', '.', 'x']), '\\61g.x');
});

test('joinPieces skips empty pieces when checking adjacency', () => {
  assert.equal(joinPieces(['\\61', '', 'b']), '\\61 b');
});

test('joinPieces of nothing is empty', () => {
  assert.equal(joinPieces([]), '');
});
