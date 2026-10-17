import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { after, before, describe, test } from 'node:test';
import process from 'node:process';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import litePreset from '#presets/lite';
import defaultPreset from '#presets/default';
import cssnano from '../../src/index.js';

const testDirectory = dirname(fileURLToPath(import.meta.url));

test('building processors twice from one options object leaves the options unchanged', () => {
  const options = { preset: litePreset, disable: ['discardComments'] };
  postcss([cssnano(options)]);
  postcss([cssnano(options)]);
  assert.deepStrictEqual(options, {
    preset: litePreset,
    disable: ['discardComments'],
  });
});

describe('configuration file priority', () => {
  let previousWorkingDirectory;

  before(() => {
    previousWorkingDirectory = process.cwd();
    process.chdir(testDirectory);
  });

  after(() => {
    process.chdir(previousWorkingDirectory);
  });

  test('should read the cssnano configuration file', () => {
    const processor = postcss([cssnano]);
    assert.strictEqual(processor.plugins.length, litePreset().length);
  });

  test('direct config should override the configuration file', async () => {
    const result = await postcss([cssnano({ preset: defaultPreset })]).process(
      'h1{color:#ffffff}',
      { from: undefined }
    );
    const defaults = await postcss(defaultPreset()).process(
      'h1{color:#ffffff}',
      { from: undefined }
    );
    assert.strictEqual(result.css, defaults.css);
  });
});
