import assert from 'node:assert/strict';
import { test } from 'node:test';
import normalizeUrl from '../src/normalize.js';

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
    'http://example.com/~foo/'
  );
});

test('should preserve trailing slash by default', () => {
  assert.strictEqual(
    normalizeUrl('https://example.com/assets/'),
    'https://example.com/assets/'
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

test('should preserve data URLs unchanged', () => {
  const fixture = 'data:image/png;base64,iVBORw0KGgo=';
  assert.strictEqual(normalizeUrl(fixture), fixture);
});

test('should preserve custom protocols unchanged', () => {
  const fixture = 'mailto:someone@example.com';
  assert.strictEqual(normalizeUrl(fixture), fixture);
});
