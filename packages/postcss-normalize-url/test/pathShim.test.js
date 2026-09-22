import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import nodePath from 'node:path';
import pathShim from '../src/lib/path_shim.js';

describe('path shim', () => {
  test('posix.normalize never rewrites backslashes to slashes', () => {
    assert.strictEqual(
      pathShim.posix.normalize('foo\\bar\\baz.png'),
      'foo\\bar\\baz.png'
    );
    assert.strictEqual(
      pathShim.normalize('foo\\bar\\baz.png'),
      'foo\\bar\\baz.png'
    );
    assert.strictEqual(
      nodePath.posix.normalize('foo\\bar\\baz.png'),
      'foo\\bar\\baz.png'
    );
  });
});
