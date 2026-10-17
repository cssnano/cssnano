import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import cssnano from '../../src/index.js';
import { presetImport } from './presetSpecifiers.js';

describe('cssnano configuration file that exports a built preset', () => {
  let directory;

  before(() => {
    directory = mkdtempSync(join(tmpdir(), 'cssnano-export-'));
  });

  after(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  test('throws for a configuration file that exports a built preset, because it is not an object of options', () => {
    const configFile = join(directory, 'cssnano.config.mjs');
    writeFileSync(
      configFile,
      `import litePreset from ${presetImport('lite')};\nexport default litePreset();\n`
    );
    assert.throws(() => cssnano({ configFile }), {
      message: `${configFile}: The configuration must be an object.`,
    });
  });
});
