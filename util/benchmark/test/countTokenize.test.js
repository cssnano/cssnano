import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const utilDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const cssnanoDir = join(utilDir, '..', 'packages', 'cssnano');

/**
 * Runs `script` as an ES module in a child process with the counting hook
 * loaded first, so the tokenizer it imports is the counted shim.
 *
 * @param {string} script
 * @return {{ calls: [string | null, number][], tokens: number }}
 */
function runCounted(script) {
  const run = spawnSync(
    process.execPath,
    [
      '--import',
      join(utilDir, 'countTokenize.js'),
      '--input-type=module',
      '-e',
      script,
    ],
    { cwd: cssnanoDir, encoding: 'utf8' }
  );
  assert.equal(run.status, 0, run.stderr);
  return JSON.parse(run.stdout);
}

const preamble = `
import { tokenize } from '@csstools/css-tokenizer';
import { counter } from ${JSON.stringify(join(utilDir, 'countTokenize.js'))};
`;

test('countTokenize counts each tokenize call on the default entry', () => {
  const result = runCounted(`${preamble}
    tokenize({ css: 'a b' });
    tokenize({ css: 'a b' });
    console.log(JSON.stringify({
      calls: [...counter.calls.entries()],
      tokens: tokenize({ css: 'a b' }).length,
    }));
  `);

  assert.deepEqual(result.calls, [[null, 2]]);
});

test('countTokenize attributes a call to the entry set around it', () => {
  const result = runCounted(`${preamble}
    counter.entry = 'entry';
    tokenize({ css: 'a' });
    counter.entry = null;
    console.log(JSON.stringify({
      calls: [...counter.calls.entries()],
      tokens: 0,
    }));
  `);

  assert.deepEqual(result.calls, [['entry', 1]]);
});

test('countTokenize forwards the tokens of the real tokenizer unchanged', () => {
  const result = runCounted(`${preamble}
    console.log(JSON.stringify({
      calls: [],
      tokens: tokenize({ css: 'a b' }).length,
    }));
  `);

  // An identifier, whitespace, another identifier and the end-of-file token.
  assert.equal(result.tokens, 4);
});
