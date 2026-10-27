import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'node:test';

const script = join(dirname(fileURLToPath(import.meta.url)), 'pluginTiming.js');

describe('pluginTiming', () => {
  test("pluginTiming's timed stage keeps minify-params' `tightensAfterName` part", () => {
    // minify-params returns `{reduce, tightensAfterName}` for @media, which
    // the timed stage must wrap rather than call.
    const result = spawnSync(
      process.execPath,
      [script, '--preset=default', '--rounds=1'],
      { encoding: 'utf8' }
    );
    assert.equal(result.stderr, '');
    assert.equal(result.status, 0);
    assert.match(result.stdout, /^ {2}minifyParams /mv);
  });
});
