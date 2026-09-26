import assert from 'node:assert/strict';
import { test } from 'node:test';
import normalizeUrl from '../src/normalize.js';

test('should preserve unprefixed URLs unchanged', () => {
  assert.strictEqual(normalizeUrl('example.com'), 'example.com');
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

test('should normalize file URLs without collapsing root to file://', () => {
  assert.strictEqual(normalizeUrl('file:///'), 'file:///');
});

test('should normalize dot segments and duplicate slashes in file URLs', () => {
  assert.strictEqual(
    normalizeUrl('file:///foo//bar/../baz.txt'),
    'file:///foo/baz.txt'
  );
});

test('should strip trailing dot from hostname', () => {
  assert.strictEqual(
    normalizeUrl('http://example.com./foo.html'),
    'http://example.com/foo.html'
  );
  assert.strictEqual(
    normalizeUrl('http://example.com./'),
    'http://example.com'
  );
});

test('should preserve trailing slash in query string parameters', () => {
  assert.strictEqual(
    normalizeUrl('http://example.com/?dir=/'),
    'http://example.com/?dir=/'
  );
  assert.strictEqual(
    normalizeUrl('http://example.com/?redirect=https://foo.com/'),
    'http://example.com/?redirect=https://foo.com/'
  );
});

test('should not decode percent-encoded control characters in absolute URLs', () => {
  assert.strictEqual(
    normalizeUrl('https://example.com/foo%0Abar'),
    'https://example.com/foo%0Abar'
  );
  assert.strictEqual(
    normalizeUrl('https://example.com/foo%0Dbar'),
    'https://example.com/foo%0Dbar'
  );
  assert.strictEqual(
    normalizeUrl('https://example.com/foo%00bar'),
    'https://example.com/foo%00bar'
  );
});

test('should not decode percent-encoded dot in absolute URLs', () => {
  assert.strictEqual(
    normalizeUrl('http://example.com/foo%2ebar.png'),
    'http://example.com/foo%2ebar.png'
  );
  assert.strictEqual(
    normalizeUrl('http://example.com/foo%2Ebar.png'),
    'http://example.com/foo%2Ebar.png'
  );
  assert.strictEqual(
    normalizeUrl('http://example.com/foo%2e%2ebar.png'),
    'http://example.com/foo%2e%2ebar.png'
  );
});

test('should preserve explicit port 80 in protocol-relative URLs', () => {
  assert.strictEqual(
    normalizeUrl('//example.com:80/image.png'),
    '//example.com:80/image.png'
  );
});

test('should preserve explicit port 443 in protocol-relative URLs', () => {
  assert.strictEqual(
    normalizeUrl('//example.com:443/image.png'),
    '//example.com:443/image.png'
  );
});

test('should preserve explicit port 80 in protocol-relative root URLs', () => {
  assert.strictEqual(normalizeUrl('//example.com:80/'), '//example.com:80');
});
