import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { describe, test } from 'node:test';
import { pluginIdempotencyTests } from '../../../util/integrationTestHelpers.js';
import preset from '../src/index.js';

const testDir = dirname(fileURLToPath(import.meta.url));

// Kept apart from integrations.test.js so the test runner can process both
// framework corpora in parallel.
describe('framework tests', () => {
  test(
    'should be idempotent for each default plugin except merge rules and svgo',
    pluginIdempotencyTests(preset, `${testDir}/integrations`, [
      'postcss-merge-rules',
      'postcss-svgo',
    ])
  );
});
