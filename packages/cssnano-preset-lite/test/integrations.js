import nodepath from 'node:path';
import { fileURLToPath } from 'node:url';
const testDir = nodepath.dirname(fileURLToPath(import.meta.url));
import { describe, test } from 'node:test';
import {
  idempotencyTests,
  integrationTests,
} from '../../../util/integrationTestHelpers.js';
import preset from '../src/index.js';

describe('lite preset framework integrations', () => {
  test(
    'should correctly handle the framework tests',
    { concurrency: true },
    integrationTests(preset, `${testDir}/integrations`)
  );
  test(
    'should be idempotent on integration outputs',
    { concurrency: true },
    idempotencyTests(preset, `${testDir}/integrations`)
  );
});
