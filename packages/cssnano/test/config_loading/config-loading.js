'use strict';
const process = require('process');
const { test } = require('uvu');
const assert = require('uvu/assert');
const postcss = require('postcss');
const litePreset = require('cssnano-preset-lite');
const defaultPreset = require('cssnano-preset-default');
const cssnano = require('../..');

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
