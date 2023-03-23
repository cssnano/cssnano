'use strict';

const assert = require('uvu/assert');
const { test } = require('uvu');
const normalizeUrl = require('../src/normalize.js');

test('should add the http prefix to unprefixed URLs', () => {
  assert.is(normalizeUrl('example.com'), 'http://example.com');
});

test('should not attempt to sort parameters', () => {
  const fixture = 'http://sindresorhus.com/?d=Z&b=Y&c=X&a=W';
  assert.is(normalizeUrl(fixture), fixture);
});

test('should leave encoded slashes alone', () => {
  const fixture = 'https://example.com/music/bands/AC%2FDC';
  assert.is(normalizeUrl(fixture), fixture);
});

test('should decode URI octets', () => {
  assert.is(
    normalizeUrl('http://example.com/%7Efoo/'),
    'http://example.com/~foo'
  );
});

test('should handle spaces inside parameters', () => {
  assert.is(
    normalizeUrl('http://example.com/?foo=bar baz'),
    'http://example.com/?foo=bar%20baz'
  );
});

test('should preserve authentication string', () => {
  const fixture = 'http://user:password@www.example.com';
  assert.is(normalizeUrl(fixture), fixture);
});

test('should preserve index', () => {
  const fixture = 'http://example.com/index.html';
  assert.is(normalizeUrl(fixture), fixture);
});

test('should preserve non-standard port', () => {
  const fixture = 'https://example.com:123';
  assert.is(normalizeUrl(fixture), fixture);
});

test('should strip default MIME type', () => {
  assert.is(normalizeUrl('data:text/plain,foo'), 'data:,foo');
});

test('should strip default charset', () => {
  assert.is(normalizeUrl('data:;charset=us-ascii,foo'), 'data:,foo');
});

test('should lowercase the MIME type', () => {
  assert.is(normalizeUrl('data:TEXT/HTML,foo'), 'data:text/html,foo');
});

test('should keep spaces when not base64', () => {
  assert.is(normalizeUrl('data:, foo #bar'), 'data:, foo #bar');
});

test('should remove trailing semicolon', () => {
  assert.is(
    normalizeUrl('data:;charset=UTF-8;,foo'),
    'data:;charset=utf-8,foo'
  );
});

test.run();
