import process from 'process';
import { test } from 'uvu';
import * as assert from 'uvu/assert';
import postcss from 'postcss';
import litePreset from 'cssnano-preset-lite';
import defaultPreset from 'cssnano-preset-default';
import cssnano from '../..';

/* The configuration is loaded relative to the current working directory,
  when running the repository tests, the working directory is 
  the repostiory root, so we need to change it to avoid having to place
  the configuration file for this test in the repo root */
let originalWorkingDir;
test.before(() => {
  originalWorkingDir = process.cwd();
  process.chdir(__dirname);
});

test.after(() => {
  process.chdir(originalWorkingDir);
});

test('should read the cssnano configuration file', () => {
  const processor = postcss([cssnano]);
  assert.is(processor.plugins.length, litePreset().plugins.length);
});

test('PostCSS config should override the cssnano config', () => {
  const processor = postcss([cssnano({ preset: 'default' })]);
  assert.is(processor.plugins.length, defaultPreset().plugins.length);
});
test.run();
