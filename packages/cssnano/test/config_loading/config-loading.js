'use strict';
const process = require('node:process');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const postcss = require('postcss');
const litePreset = require('cssnano-preset-lite');
const defaultPreset = require('cssnano-preset-default');
const autoprefixer = require('autoprefixer');
const cssnano = require('../../src/index.js');

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
