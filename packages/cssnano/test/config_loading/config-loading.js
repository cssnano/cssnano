import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
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

async function inTemporaryDirectory(callback) {
  const directory = mkdtempSync(`${tmpdir()}/cssnano-config-`);
  const previous = process.cwd();
  process.chdir(directory);
  try {
    return await callback(directory);
  } finally {
    process.chdir(previous);
    rmSync(directory, { recursive: true, force: true });
  }
}

test('uses the default preset when no local configuration exists', async () => {
  await inTemporaryDirectory(() => {
    assert.strictEqual(
      postcss([cssnano]).plugins.length,
      defaultPreset().plugins.length
    );
  });
});

test('uses configuration sources in documented precedence order', async () => {
  await inTemporaryDirectory((directory) => {
    writeFileSync(`${directory}/package.json`, '{"cssnano":{"preset":"lite"}}');
    writeFileSync(`${directory}/.cssnanorc.json`, '{"preset":"default"}');
    writeFileSync(
      `${directory}/.cssnanorc.js`,
      'module.exports = { preset: "default" };'
    );
    writeFileSync(
      `${directory}/cssnano.config.js`,
      'module.exports = { preset: "default" };'
    );
    assert.strictEqual(
      postcss([cssnano]).plugins.length,
      litePreset().plugins.length
    );
  });
});

test('continues to lower-priority configuration when package config is null', async () => {
  await inTemporaryDirectory((directory) => {
    writeFileSync(`${directory}/package.json`, '{"cssnano":null}');
    writeFileSync(`${directory}/.cssnanorc.json`, '{"preset":"lite"}');
    assert.strictEqual(
      postcss([cssnano]).plugins.length,
      litePreset().plugins.length
    );
  });
});

test('does not discover unsupported or parent configuration files', async () => {
  await inTemporaryDirectory((directory) => {
    writeFileSync(`${directory}/.cssnanorc`, '{"preset":"lite"}');
    writeFileSync(`${directory}/.cssnanorc.json`, '{"preset":"lite"}');
    mkdirSync(`${directory}/child`);
    process.chdir(`${directory}/child`);
    assert.strictEqual(
      postcss([cssnano]).plugins.length,
      defaultPreset().plugins.length
    );
  });
});

test('fails clearly when an explicit configuration file is missing', async () => {
  await inTemporaryDirectory(() => {
    assert.throws(
      () => cssnano({ configFile: 'cssnano.config.js' }),
      /Cannot find cssnano configuration file/
    );
  });
});

test('configFile accepts relative and absolute supported paths', async () => {
  await inTemporaryDirectory((directory) => {
    writeFileSync(`${directory}/.cssnanorc.json`, '{"preset":"lite"}');
    assert.throws(() => cssnano({ configFile: 'config' }), /Unsupported/);
    assert.strictEqual(
      postcss([cssnano({ configFile: '.cssnanorc.json' })]).plugins.length,
      litePreset().plugins.length
    );
    assert.strictEqual(
      postcss([cssnano({ configFile: `${directory}/.cssnanorc.json` })]).plugins
        .length,
      litePreset().plugins.length
    );
  });
});

test('resolves dependencies of JavaScript configuration files locally', async () => {
  await inTemporaryDirectory((directory) => {
    writeFileSync(
      `${directory}/local-preset.js`,
      'module.exports = { preset: "lite" };'
    );
    writeFileSync(
      `${directory}/cssnano.config.js`,
      'module.exports = require("./local-preset.js");'
    );
    assert.strictEqual(
      postcss([cssnano({ configFile: 'cssnano.config.js' })]).plugins.length,
      litePreset().plugins.length
    );
  });
});

test('inline preset and plugins bypass discovered configuration', async () => {
  await inTemporaryDirectory((directory) => {
    writeFileSync(`${directory}/.cssnanorc.json`, '{"preset":"default"}');
    assert.strictEqual(
      postcss([cssnano({ preset: 'lite' })]).plugins.length,
      litePreset().plugins.length
    );
    assert.strictEqual(
      postcss([cssnano({ plugins: [autoprefixer] })]).plugins.length,
      1
    );
  });
});

test('does not mutate options or preset plugin arrays when adding plugins', () => {
  const preset = litePreset();
  const options = { preset, plugins: [autoprefixer] };
  const originalPlugins = preset.plugins.slice();
  postcss([cssnano(options)]);
  postcss([cssnano(options)]);
  assert.deepStrictEqual(preset.plugins, originalPlugins);
  assert.deepStrictEqual(options, { preset, plugins: [autoprefixer] });
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
