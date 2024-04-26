'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const normalizeUrl = require('../src/normalize.js');

test('should add the http prefix to unprefixed URLs', () => {
  assert.strictEqual(normalizeUrl('example.com'), 'http://example.com');
});

test('should not attempt to sort parameters', () => {
  const fixture = 'http://sindresorhus.com/?d=Z&b=Y&c=X&a=W';
  assert.strictEqual(normalizeUrl(fixture), fixture);
});

test('should leave encoded slashes alone', () => {
  const fixture = 'https://example.com/music/bands/AC%2FDC';
  assert.strictEqual(normalizeUrl(fixture), fixture);
});

test('should decode URI octets', () => {
  assert.strictEqual(
    normalizeUrl('http://example.com/%7Efoo/'),
    'http://example.com/~foo'
  );
});

test('should handle spaces inside parameters', () => {
  assert.strictEqual(
    normalizeUrl('http://example.com/?foo=bar baz'),
    'http://example.com/?foo=bar%20baz'
  );
});

test('should preserve authentication string', () => {
  const fixture = 'http://user:password@www.example.com';
  assert.strictEqual(normalizeUrl(fixture), fixture);
});

test('should preserve index', () => {
  const fixture = 'http://example.com/index.html';
  assert.strictEqual(normalizeUrl(fixture), fixture);
});

test('should preserve non-standard port', () => {
  const fixture = 'https://example.com:123';
  assert.strictEqual(normalizeUrl(fixture), fixture);
});

test('should strip default MIME type', () => {
  assert.strictEqual(normalizeUrl('data:text/plain,foo'), 'data:,foo');
});

test('should strip default charset', () => {
  assert.strictEqual(normalizeUrl('data:;charset=us-ascii,foo'), 'data:,foo');
});

test('should lowercase the MIME type', () => {
  assert.strictEqual(normalizeUrl('data:TEXT/HTML,foo'), 'data:text/html,foo');
});

test('should keep spaces when not base64', () => {
  assert.strictEqual(normalizeUrl('data:, foo #bar'), 'data:, foo #bar');
});

test('should remove trailing semicolon', () => {
  assert.strictEqual(
    normalizeUrl('data:;charset=UTF-8;,foo'),
    'data:;charset=utf-8,foo'
  );
});
