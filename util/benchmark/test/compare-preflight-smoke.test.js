import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { runPreflight } from '../compare-preflight.js';
import {
  baseConfig,
  cleanupConfig,
  prepareCheckout,
  smokeSnapshot,
} from '../preflightTestHelpers.js';

// Checkouts do not mark bench.js executable, so the real smoke run must start
// it with Node rather than executing the script path directly.
function writeSmokeBenchStub(dir, side) {
  mkdirSync(join(dir, 'util/benchmark'), { recursive: true });
  writeFileSync(
    join(dir, 'util/benchmark/bench.js'),
    `const { writeFileSync } = process.getBuiltinModule('node:fs');
const option = (name) =>
  process.argv.find((argument) => argument.startsWith(name + '=')).slice(name.length + 1);
writeFileSync(
  option('--results-dir') + '/' + option('--label') + '.json',
  ${JSON.stringify(smokeSnapshot(side, 'a'.repeat(64)))}
);
`
  );
}

test('runPreflight starts each smoke run with the Node executable', async () => {
  const config = baseConfig();
  config.baseRevision = prepareCheckout(config.baseDir, 'fixture.css');
  config.candidateRevision = prepareCheckout(
    config.candidateDir,
    'fixture.css'
  );
  writeSmokeBenchStub(config.baseDir, 'baseline');
  writeSmokeBenchStub(config.candidateDir, 'candidate');
  try {
    const result = await runPreflight(config);
    assert.deepEqual(result.failures, []);
  } finally {
    cleanupConfig(config);
  }
});
