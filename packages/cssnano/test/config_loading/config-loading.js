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

test('ignores package.json and uses the first supported configuration', async () => {
  await inTemporaryDirectory((directory) => {
    writeFileSync(`${directory}/package.json`, '{"cssnano":{"preset":"lite"}}');
    writeFileSync(`${directory}/.cssnanorc.json`, '{"preset":"lite"}');
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

test('uses the default preset when package.json is the only configuration', async () => {
  await inTemporaryDirectory((directory) => {
    writeFileSync(`${directory}/package.json`, '{"cssnano":{"preset":"lite"}}');
    assert.strictEqual(
      postcss([cssnano]).plugins.length,
      defaultPreset().plugins.length
    );
  });
});

test('does not discover unsupported or parent configuration files', async () => {
  await inTemporaryDirectory((directory) => {
    writeFileSync(`${directory}/.cssnanorc`, '{"preset":"lite"}');
    writeFileSync(`${directory}/.cssnanorc.json`, '{"preset":"lite"}');
    writeFileSync(
      `${directory}/.cssnanorc.js`,
      'module.exports = { preset: "lite" };'
    );
    writeFileSync(
      `${directory}/cssnano.config.mjs`,
      'export default { preset: "lite" };'
    );
    writeFileSync(
      `${directory}/cssnano.config.ts`,
      'const preset: string = "lite"; export default { preset };'
    );
    writeFileSync(
      `${directory}/cssnano.config.mts`,
      'export default { preset: "lite" };'
    );
    mkdirSync(`${directory}/child`);
    process.chdir(`${directory}/child`);
    assert.strictEqual(
      postcss([cssnano]).plugins.length,
      defaultPreset().plugins.length
    );
  });
});

test('loads explicit ESM and TypeScript configuration files', async () => {
  await inTemporaryDirectory((directory) => {
    for (const extension of ['mjs', 'ts', 'mts']) {
      const config =
        extension === 'ts'
          ? 'const preset: string = "lite"; export default { preset };'
          : 'export default { preset: "lite" };';
      writeFileSync(`${directory}/config.${extension}`, config);
      assert.strictEqual(
        postcss([cssnano({ configFile: `config.${extension}` })]).plugins
          .length,
        litePreset().plugins.length
      );
    }
  });
});

test('loads CommonJS TypeScript configuration files and ESM .mts files', async () => {
  await inTemporaryDirectory((directory) => {
    writeFileSync(`${directory}/package.json`, '{"type":"commonjs"}');
    writeFileSync(
      `${directory}/config.ts`,
      'module.exports = { preset: "lite" };'
    );
    writeFileSync(
      `${directory}/config.mts`,
      'export default { preset: "lite" };'
    );
    for (const extension of ['ts', 'mts']) {
      assert.strictEqual(
        postcss([cssnano({ configFile: `config.${extension}` })]).plugins
          .length,
        litePreset().plugins.length
      );
    }
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

test('configFile accepts relative and absolute paths', async () => {
  await inTemporaryDirectory((directory) => {
    writeFileSync(`${directory}/.cssnanorc.json`, '{"preset":"lite"}');
    writeFileSync(
      `${directory}/custom-config.js`,
      'module.exports = { preset: "lite" };'
    );
    writeFileSync(
      `${directory}/custom-config`,
      'module.exports = { preset: "lite" };'
    );
    assert.strictEqual(
      postcss([cssnano({ configFile: 'custom-config.js' })]).plugins.length,
      litePreset().plugins.length
    );
    assert.strictEqual(
      postcss([cssnano({ configFile: 'custom-config' })]).plugins.length,
      litePreset().plugins.length
    );
    assert.strictEqual(
      postcss([cssnano({ configFile: `${directory}/custom-config.js` })])
        .plugins.length,
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
