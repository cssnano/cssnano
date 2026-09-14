import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decode } from '../src/lib/url.js';

test('should return input string as-is when no percent character is present', () => {
  const input = '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>';
  assert.strictEqual(decode(input), input);
});

test('should decode standard ASCII percent-encoded characters', () => {
  const input = '%3csvg%20xmlns=%27http://www.w3.org/2000/svg%27%3e%3c/svg%3e';
  assert.strictEqual(
    decode(input),
    "<svg xmlns='http://www.w3.org/2000/svg'></svg>"
  );
});

test('should support both uppercase and lowercase hex digits', () => {
  assert.strictEqual(decode('%3C%3E'), '<>');
  assert.strictEqual(decode('%3c%3e'), '<>');
  assert.strictEqual(decode('%2F%2f'), '//');
});

test('should decode multi-byte UTF-8 percent-encoded characters', () => {
  assert.strictEqual(decode('%C3%A9'), 'é');
  assert.strictEqual(decode('%E2%98%83'), '☃');
  assert.strictEqual(decode('%E2%82%AC'), '€');
  assert.strictEqual(decode('%F0%9F%9A%80'), '🚀');
});

test('should preserve raw unencoded multi-byte UTF-8 alongside percent escapes', () => {
  const input = 'café 100% ☕ %3csvg%3e';
  assert.strictEqual(decode(input), 'café 100% ☕ <svg>');
});

test('should not perform recursive double decoding', () => {
  assert.strictEqual(decode('%253c'), '%3c');
  assert.strictEqual(decode('%2520'), '%20');
  assert.strictEqual(decode('%25'), '%');
});

test('should preserve unencoded percent characters per WHATWG URL spec', () => {
  assert.strictEqual(decode('test%'), 'test%');
  assert.strictEqual(decode('test%2'), 'test%2');
  assert.strictEqual(decode('test%zz'), 'test%zz');
  assert.strictEqual(decode('test%G0'), 'test%G0');
  assert.strictEqual(decode('test%--'), 'test%--');
  assert.strictEqual(decode('rgb(0 0 0 / 80%)'), 'rgb(0 0 0 / 80%)');
  assert.strictEqual(decode('100%'), '100%');
  assert.strictEqual(decode('%%'), '%%');
});

test('should throw URIError when percent-encoded bytes form invalid UTF-8', () => {
  assert.throws(
    () => decode('%FF'),
    (err) => err instanceof URIError && /UTF-8/i.test(err.message)
  );
  assert.throws(
    () => decode('%E2%82'),
    (err) => err instanceof URIError && /UTF-8/i.test(err.message)
  );
  assert.throws(
    () => decode('%C0%AF'),
    (err) => err instanceof URIError && /UTF-8/i.test(err.message)
  );
});

test('should throw URIError on UTF-16 surrogate halves encoded in UTF-8', () => {
  assert.throws(
    () => decode('%ED%A0%80'),
    (err) => err instanceof URIError && /UTF-8/i.test(err.message)
  );
  assert.throws(
    () => decode('%ED%BF%BF'),
    (err) => err instanceof URIError && /UTF-8/i.test(err.message)
  );
});

test('should throw URIError on code points exceeding Unicode maximum range', () => {
  assert.throws(
    () => decode('%F4%90%80%80'),
    (err) => err instanceof URIError && /UTF-8/i.test(err.message)
  );
  assert.throws(
    () => decode('%F5%80%80%80'),
    (err) => err instanceof URIError && /UTF-8/i.test(err.message)
  );
});

test('should throw URIError on stray continuation bytes or truncated multi-byte sequences', () => {
  assert.throws(
    () => decode('%80'),
    (err) => err instanceof URIError && /UTF-8/i.test(err.message)
  );
  assert.throws(
    () => decode('%BF'),
    (err) => err instanceof URIError && /UTF-8/i.test(err.message)
  );
  assert.throws(
    () => decode('%C2'),
    (err) => err instanceof URIError && /UTF-8/i.test(err.message)
  );
  assert.throws(
    () => decode('%F0%9F%9A'),
    (err) => err instanceof URIError && /UTF-8/i.test(err.message)
  );
});

test('should throw URIError on overlong 3-byte and 4-byte UTF-8 encodings', () => {
  assert.throws(
    () => decode('%E0%80%AF'),
    (err) => err instanceof URIError && /UTF-8/i.test(err.message)
  );
  assert.throws(
    () => decode('%F0%80%80%AF'),
    (err) => err instanceof URIError && /UTF-8/i.test(err.message)
  );
});

test('should decode percent-encoded null bytes without error', () => {
  assert.strictEqual(decode('%00'), '\0');
  assert.strictEqual(decode('abc%00def'), 'abc\0def');
});

test('should handle empty input and edge percent boundaries', () => {
  assert.strictEqual(decode(''), '');
  assert.strictEqual(decode('%'), '%');
  assert.strictEqual(decode('%2'), '%2');
  assert.strictEqual(decode('%2g'), '%2g');
  assert.strictEqual(decode('%g2'), '%g2');
  assert.strictEqual(decode('abc%'), 'abc%');
  assert.strictEqual(decode('abc%2'), 'abc%2');
  assert.strictEqual(decode('abc%2g'), 'abc%2g');
});

test('should handle consecutive and repeated percent characters', () => {
  assert.strictEqual(decode('%%%'), '%%%');
  assert.strictEqual(decode('%%%3c'), '%%<');
  assert.strictEqual(decode('%25%25'), '%%');
  assert.strictEqual(decode('%25%'), '%%');
  assert.strictEqual(decode('%253c%25'), '%3c%');
  assert.strictEqual(decode('%%%%3c%20'), '%%%< ');
});

test('should handle valid percent escapes mixed with literal unencoded percent characters', () => {
  assert.strictEqual(decode('%3c100%%20valid%'), '<100% valid%');
  assert.strictEqual(decode('%25%3c%25'), '%<%');
});

test('should preserve an encoded leading UTF-8 BOM', () => {
  const input = '%EF%BB%BF%3Csvg%2F%3E';

  assert.strictEqual(decode(input), '\uFEFF<svg/>');
});
