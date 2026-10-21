import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { describe, test } from 'node:test';
import { pluginIdempotencyTests } from '../../../../../util/integrationTestHelpers.js';
import preset from '../../../src/presets/default.js';

const testDir = dirname(fileURLToPath(import.meta.url));

// Kept apart from integrations.test.js so the test runner can process both
// framework corpora in parallel.
describe('framework tests', () => {
  test(
    'should be idempotent for each default plugin, with merge run without rule merging',
    pluginIdempotencyTests(preset, `${testDir}/integrations`, {
      // Rule merging is not idempotent on its own, so merge runs with it off.
      merge: { rules: false },
    })
  );
});
