import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import process from 'node:process';
import {
  after,
  afterEach,
  before,
  beforeEach,
  describe,
  test,
} from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import litePreset from 'cssnano-preset-lite';
import defaultPreset from 'cssnano-preset-default';
import autoprefixer from 'autoprefixer';
import cssnano from '../../src/index.js';

const testDirectory = dirname(fileURLToPath(import.meta.url));

describe('cssnano config loading', () => {
  let temporaryDirectory;
  let previousWorkingDirectory;

  beforeEach(() => {
    temporaryDirectory = mkdtempSync(`${tmpdir()}/cssnano-config-`);
    previousWorkingDirectory = process.cwd();
    process.chdir(temporaryDirectory);
  });

  afterEach(() => {
    process.chdir(previousWorkingDirectory);
    rmSync(temporaryDirectory, { recursive: true, force: true });
  });

  test('uses the default preset when no local configuration exists', () => {
    assert.strictEqual(
      postcss([cssnano]).plugins.length,
      defaultPreset().plugins.length
    );
  });

  test('ignores package.json and uses the first supported configuration', () => {
    writeFileSync(
      `${temporaryDirectory}/package.json`,
      '{"cssnano":{"preset":"lite"}}'
    );
    writeFileSync(`${temporaryDirectory}/.cssnanorc.json`, '{"preset":"lite"}');
    writeFileSync(
      `${temporaryDirectory}/cssnano.config.js`,
      'module.exports = { preset: "default" };'
    );
    assert.strictEqual(
      postcss([cssnano]).plugins.length,
      litePreset().plugins.length
    );
  });

  test('uses the default preset when package.json is the only configuration', () => {
    writeFileSync(
      `${temporaryDirectory}/package.json`,
      '{"cssnano":{"preset":"lite"}}'
    );
    assert.strictEqual(
      postcss([cssnano]).plugins.length,
      defaultPreset().plugins.length
    );
  });

  test('does not discover unsupported or parent configuration files', () => {
    writeFileSync(`${temporaryDirectory}/.cssnanorc`, '{"preset":"lite"}');
    writeFileSync(`${temporaryDirectory}/.cssnanorc.json`, '{"preset":"lite"}');
    writeFileSync(
      `${temporaryDirectory}/.cssnanorc.js`,
      'module.exports = { preset: "lite" };'
    );
    writeFileSync(
      `${temporaryDirectory}/cssnano.config.mjs`,
      'export default { preset: "lite" };'
    );
    writeFileSync(
      `${temporaryDirectory}/cssnano.config.ts`,
      'const preset: string = "lite"; export default { preset };'
    );
    writeFileSync(
      `${temporaryDirectory}/cssnano.config.mts`,
      'export default { preset: "lite" };'
    );
    mkdirSync(`${temporaryDirectory}/child`);
    process.chdir(`${temporaryDirectory}/child`);
    assert.strictEqual(
      postcss([cssnano]).plugins.length,
      defaultPreset().plugins.length
    );
  });

  test('loads explicit ESM and TypeScript configuration files', () => {
    for (const extension of ['mjs', 'ts', 'mts']) {
      const config =
        extension === 'ts'
          ? 'const preset: string = "lite"; export default { preset };'
          : 'export default { preset: "lite" };';
      writeFileSync(`${temporaryDirectory}/config.${extension}`, config);
      assert.strictEqual(
        postcss([cssnano({ configFile: `config.${extension}` })]).plugins
          .length,
        litePreset().plugins.length
      );
    }
  });

  test('loads CommonJS TypeScript configuration files and ESM .mts files', () => {
    writeFileSync(`${temporaryDirectory}/package.json`, '{"type":"commonjs"}');
    writeFileSync(
      `${temporaryDirectory}/config.ts`,
      'module.exports = { preset: "lite" };'
    );
    writeFileSync(
      `${temporaryDirectory}/config.mts`,
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

  test('fails clearly when an explicit configuration file is missing', () => {
    assert.throws(
      () => cssnano({ configFile: 'cssnano.config.js' }),
      /Cannot find cssnano configuration file/
    );
  });

  test('configFile accepts relative and absolute paths', () => {
    writeFileSync(`${temporaryDirectory}/.cssnanorc.json`, '{"preset":"lite"}');
    writeFileSync(
      `${temporaryDirectory}/custom-config.js`,
      'module.exports = { preset: "lite" };'
    );
    writeFileSync(
      `${temporaryDirectory}/custom-config`,
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
      postcss([
        cssnano({ configFile: `${temporaryDirectory}/custom-config.js` }),
      ]).plugins.length,
      litePreset().plugins.length
    );
  });

  test('resolves dependencies of JavaScript configuration files locally', () => {
    writeFileSync(
      `${temporaryDirectory}/local-preset.js`,
      'module.exports = { preset: "lite" };'
    );
    writeFileSync(
      `${temporaryDirectory}/cssnano.config.js`,
      'module.exports = require("./local-preset.js");'
    );
    assert.strictEqual(
      postcss([cssnano({ configFile: 'cssnano.config.js' })]).plugins.length,
      litePreset().plugins.length
    );
  });

  test('inline preset and plugins bypass discovered configuration', () => {
    writeFileSync(
      `${temporaryDirectory}/.cssnanorc.json`,
      '{"preset":"default"}'
    );
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
    assert.strictEqual(processor.plugins.length, litePreset().plugins.length);
  });

  test('direct config should override the configuration file', () => {
    const processor = postcss([cssnano({ preset: 'default' })]);
    assert.strictEqual(
      processor.plugins.length,
      defaultPreset().plugins.length
    );
  });
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
