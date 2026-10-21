// Runs the real CLI against two checkouts of HEAD. Each side installs its
// dependencies, so this takes minutes; it is kept out of `test:benchmark`.

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { test } from 'node:test';

const REPOSITORY = resolve(import.meta.dirname, '..', '..', '..');

test('HEAD against HEAD on a small case reports no meaningful change', () => {
  const output = execFileSync(
    process.execPath,
    [
      'util/benchmark/bench.js',
      '--case=merge-rules-sparse',
      '--base=HEAD',
      '--candidate=HEAD',
      '--budget=5m',
    ],
    { cwd: REPOSITORY, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
  );
  assert.match(output, /merge-rules-sparse: .* no-meaningful-change/v);
});
