import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import process from 'node:process';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import litePreset from 'cssnano-preset-lite';
import defaultPreset from 'cssnano-preset-default';
import autoprefixer from 'autoprefixer';
import cssnano from '../../src/index.js';

/* The configuration is loaded relative to the current working directory,
  when running the repository tests, the working directory is
  the repostiory root, so we need to change it to avoid having to place
  the configuration file for this test in the repo root */
let originalWorkingDir;
test.before(() => {
  originalWorkingDir = process.cwd();
  process.chdir(dirname(fileURLToPath(import.meta.url)));
});

test.after(() => {
  process.chdir(originalWorkingDir);
});

test('should read the cssnano configuration file', () => {
  const processor = postcss([cssnano]);
  assert.strictEqual(processor.plugins.length, litePreset().plugins.length);
});

test('PostCSS config should override the cssnano config', () => {
  const processor = postcss([cssnano({ preset: 'default' })]);
  assert.strictEqual(processor.plugins.length, defaultPreset().plugins.length);
});

test('direct plugins should bypass the cssnano configuration file', async () => {
  const result = await postcss([cssnano({ plugins: [autoprefixer] })]).process(
    `.example { user-select: none; }`,
    { from: undefined }
  );

  assert.strictEqual(
    result.css,
    `.example { -ms-user-select: none; user-select: none; }`
  );
});
