import nodepath from 'node:path';
import { fileURLToPath } from 'node:url';
const testDir = nodepath.dirname(fileURLToPath(import.meta.url));
import nodetest from 'node:test';
import { integrationTests } from '../../../util/integrationTestHelpers.js';
import preset from '../src/index.js';

const { describe, test } = nodetest;
describe('lite preset framework integrations', () => {
  test(
    'should correctly handle the framework tests',
    { concurrency: true },
    integrationTests(preset, `${testDir}/integrations`)
  );
});
