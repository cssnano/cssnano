import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import process from 'node:process';
import { afterEach, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import litePreset from '#presets/lite';
import defaultPreset from '#presets/default';
import cssnano from '../../src/index.js';
import { presetImport, presetRequire } from './presetSpecifiers.js';

/**
 * @param {string} options a JavaScript expression that uses the variable lite
 * @returns {string} an ES module that exports the options
 */
const esmConfig = (options) =>
  `import lite from ${presetImport('lite')};\nexport default ${options};\n`;

/**
 * @param {string} options a JavaScript expression that uses the variable lite
 * @returns {string} a CommonJS module that exports the options
 */
const cjsConfig = (options) =>
  `const lite = require(${presetRequire('lite')});\nmodule.exports = ${options};\n`;

describe('cssnano config loading', () => {
  let temporaryDirectory;
  let previousWorkingDirectory;

  function writePackageType(type) {
    writeFileSync(
      `${temporaryDirectory}/package.json`,
      JSON.stringify({ type })
    );
  }

  beforeEach(() => {
    temporaryDirectory = mkdtempSync(`${tmpdir()}/cssnano-config-`);
    writePackageType('module');
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
      defaultPreset().length
    );
  });

  test('ignores package.json, which holds no cssnano configuration', () => {
    writeFileSync(
      `${temporaryDirectory}/package.json`,
      '{"cssnano":{"preset":"lite"}}'
    );
    assert.strictEqual(
      postcss([cssnano]).plugins.length,
      defaultPreset().length
    );
  });

  test('does not discover a configuration file that is not cssnano.config.js in the working directory', () => {
    writeFileSync(
      `${temporaryDirectory}/.cssnanorc`,
      esmConfig('{ preset: lite }')
    );
    writeFileSync(
      `${temporaryDirectory}/.cssnanorc.js`,
      esmConfig('{ preset: lite }')
    );
    writeFileSync(
      `${temporaryDirectory}/cssnano.config.mjs`,
      esmConfig('{ preset: lite }')
    );
    writeFileSync(
      `${temporaryDirectory}/cssnano.config.mts`,
      esmConfig('{ preset: lite }')
    );
    mkdirSync(`${temporaryDirectory}/child`);
    process.chdir(`${temporaryDirectory}/child`);
    assert.strictEqual(
      postcss([cssnano]).plugins.length,
      defaultPreset().length
    );
  });

  test('throws for a retired JSON configuration file, because its options would be ignored and the default preset would run', () => {
    writeFileSync(`${temporaryDirectory}/.cssnanorc.json`, '{"preset":"lite"}');
    assert.throws(() => cssnano(), {
      message:
        /^"\.cssnanorc\.json" is not read; move its options to cssnano\.config\.js/v,
    });
  });

  test('reads an explicit configFile without reporting a retired JSON file that it does not name', () => {
    writeFileSync(`${temporaryDirectory}/.cssnanorc.json`, '{"preset":"lite"}');
    writeFileSync(
      `${temporaryDirectory}/custom.js`,
      esmConfig('{ preset: lite }')
    );
    assert.strictEqual(
      postcss([cssnano({ configFile: 'custom.js' })]).plugins.length,
      litePreset().length
    );
  });

  test('loads an explicit ESM or TypeScript configuration file', () => {
    for (const extension of ['mjs', 'ts', 'mts']) {
      writeFileSync(
        `${temporaryDirectory}/config.${extension}`,
        esmConfig('{ preset: lite }')
      );
      assert.strictEqual(
        postcss([cssnano({ configFile: `config.${extension}` })]).plugins
          .length,
        litePreset().length
      );
    }
  });

  test('loads a CommonJS TypeScript configuration file and an ESM .mts file', () => {
    writePackageType('commonjs');
    writeFileSync(
      `${temporaryDirectory}/config.ts`,
      cjsConfig('{ preset: lite }')
    );
    writeFileSync(
      `${temporaryDirectory}/config.mts`,
      esmConfig('{ preset: lite }')
    );
    for (const extension of ['ts', 'mts']) {
      assert.strictEqual(
        postcss([cssnano({ configFile: `config.${extension}` })]).plugins
          .length,
        litePreset().length
      );
    }
  });

  test('fails clearly when an explicit configuration file is missing', () => {
    assert.throws(
      () => cssnano({ configFile: 'cssnano.config.js' }),
      /Cannot find cssnano configuration file/v
    );
  });

  test('throws for a configFile that is a directory, not a file', () => {
    assert.throws(
      () => cssnano({ configFile: '.' }),
      /Cannot find cssnano configuration file/v
    );
  });

  test('skips a directory named like the discovered configuration file', () => {
    mkdirSync(`${temporaryDirectory}/cssnano.config.js`);
    assert.strictEqual(
      postcss([cssnano()]).plugins.length,
      defaultPreset().length
    );
  });

  test('throws for a JSON configFile, because a JSON file cannot import a preset', () => {
    writeFileSync(`${temporaryDirectory}/config.json`, '{"preset":"lite"}');
    assert.throws(() => cssnano({ configFile: 'config.json' }), {
      message: /^config\.json: JSON configuration files are not supported/v,
    });
  });

  test('throws for a JSON configFile whose extension is upper case, too', () => {
    writeFileSync(`${temporaryDirectory}/config.JSON`, '{}');
    assert.throws(() => cssnano({ configFile: 'config.JSON' }), {
      message: /^config\.JSON: JSON configuration files are not supported/v,
    });
  });

  test('configFile accepts relative and absolute paths', () => {
    writePackageType('commonjs');
    writeFileSync(
      `${temporaryDirectory}/custom-config.js`,
      cjsConfig('{ preset: lite }')
    );
    writeFileSync(
      `${temporaryDirectory}/custom-config`,
      cjsConfig('{ preset: lite }')
    );
    assert.strictEqual(
      postcss([cssnano({ configFile: 'custom-config.js' })]).plugins.length,
      litePreset().length
    );
    assert.strictEqual(
      postcss([cssnano({ configFile: 'custom-config' })]).plugins.length,
      litePreset().length
    );
    assert.strictEqual(
      postcss([
        cssnano({ configFile: `${temporaryDirectory}/custom-config.js` }),
      ]).plugins.length,
      litePreset().length
    );
  });

  test('resolves dependencies of JavaScript configuration files locally', () => {
    writePackageType('commonjs');
    writeFileSync(
      `${temporaryDirectory}/local-options.js`,
      'module.exports = { disable: ["discardComments"] };'
    );
    writeFileSync(
      `${temporaryDirectory}/cssnano.config.js`,
      `const options = require("./local-options.js");\nmodule.exports = { ...options, preset: require(${presetRequire('lite')}) };`
    );
    assert.strictEqual(
      postcss([cssnano({ configFile: 'cssnano.config.js' })]).plugins.length,
      litePreset({ disable: ['discardComments'] }).length
    );
  });

  test('an inline preset bypasses the discovered configuration file without reading it', async () => {
    writeFileSync(`${temporaryDirectory}/cssnano.config.js`, '{ preset: ');
    const result = await postcss([cssnano({ preset: litePreset })]).process(
      'h1{color:#ffffff}',
      { from: undefined }
    );
    assert.strictEqual(result.css, 'h1{color:#ffffff}');
  });

  test('throws for a configuration file that names a preset by a string, which is not a preset function', () => {
    writeFileSync(
      `${temporaryDirectory}/cssnano.config.js`,
      'export default { preset: "lite" };'
    );
    assert.throws(() => cssnano(), {
      message:
        /^cssnano\.config\.js: Option "preset" must be a preset imported from cssnano/v,
    });
  });

  test('throws for a preset array in a configuration file', () => {
    writeFileSync(
      `${temporaryDirectory}/cssnano.config.js`,
      'export default { preset: ["lite", { colormin: false }] };'
    );
    assert.throws(() => cssnano(), {
      message:
        /^cssnano\.config\.js: Option "preset" must be a preset imported from cssnano/v,
    });
  });

  test('throws for plugins inside a configuration file, so a plugin the user added is not dropped', () => {
    writeFileSync(
      `${temporaryDirectory}/cssnano.config.js`,
      esmConfig('{ preset: lite, plugins: [] }')
    );
    assert.throws(
      () => cssnano(),
      /"plugins" was removed; configure additional PostCSS plugins/v
    );
  });

  test('throws for configFile inside a configuration file, which is not an option of a file', () => {
    writeFileSync(
      `${temporaryDirectory}/cssnano.config.js`,
      esmConfig('{ configFile: "other.js", preset: lite }')
    );
    assert.throws(() => cssnano(), {
      message:
        'cssnano.config.js: "configFile" is not an option of a configuration file.',
    });
  });

  test('throws for an empty configFile, because a non-empty name is the only valid value', () => {
    writeFileSync(
      `${temporaryDirectory}/cssnano.config.js`,
      esmConfig('{ preset: lite }')
    );
    assert.throws(() => cssnano({ configFile: '' }), {
      message: 'Option "configFile" must be a non-empty string.',
    });
  });

  test('throws for a configFile of only whitespace, which names no file', () => {
    assert.throws(() => cssnano({ configFile: '   ' }), {
      message: 'Option "configFile" must be a non-empty string.',
    });
  });

  test('throws when a built preset is given inline as preset, because it must be a preset imported from cssnano', () => {
    assert.throws(() => cssnano({ preset: litePreset() }), {
      message: /^Option "preset" must be a preset imported from cssnano/v,
    });
  });

  test('throws when preset and configFile are both given', () => {
    writeFileSync(
      `${temporaryDirectory}/custom.js`,
      esmConfig('{ preset: lite }')
    );
    assert.throws(
      () => cssnano({ preset: litePreset, configFile: 'custom.js' }),
      /Set either inline options or configFile, not both/v
    );
  });

  test('throws for a configuration file whose export is not an object', () => {
    writeFileSync(
      `${temporaryDirectory}/cssnano.config.js`,
      'export default "lite";'
    );
    assert.throws(() => cssnano(), {
      message: 'cssnano.config.js: The configuration must be an object.',
    });
  });

  test('a configuration file with only browserslist and no preset runs the default preset with those targets', async () => {
    writeFileSync(
      `${temporaryDirectory}/cssnano.config.js`,
      'export default { browserslist: { query: "defaults" } };'
    );
    const result = await postcss([cssnano()]).process('h1{color:#ffffff}', {
      from: undefined,
    });
    const expected = await postcss(
      defaultPreset({ browserslist: { query: 'defaults' } })
    ).process('h1{color:#ffffff}', { from: undefined });
    assert.strictEqual(result.css, expected.css);
  });

  test('names the file when its disable names a plugin that the default preset does not run, and it has no preset', () => {
    writeFileSync(
      `${temporaryDirectory}/cssnano.config.js`,
      'export default { disable: ["zindex"] };'
    );
    assert.throws(() => cssnano(), {
      message:
        'cssnano.config.js: "zindex" in disable is not a plugin that the preset runs.',
    });
  });

  test('throws for an ES module configuration without a default export, which the docs require', () => {
    writeFileSync(
      `${temporaryDirectory}/cssnano.config.js`,
      'export const options = { browserslist: { query: "defaults" } };'
    );
    assert.throws(() => cssnano(), {
      message:
        'cssnano.config.js: An ES module configuration must have a default export.',
    });
  });

  test('throws for an unknown key in a configuration file, and names the file', () => {
    writeFileSync(
      `${temporaryDirectory}/cssnano.config.js`,
      esmConfig('{ presett: "lite", preset: lite }')
    );
    assert.throws(() => cssnano(), {
      message:
        'cssnano.config.js: "presett" is not an option of a configuration file.',
    });
  });

  test('names the file when it throws a value that is not an Error', () => {
    writeFileSync(`${temporaryDirectory}/cssnano.config.js`, 'throw "stop";');
    assert.throws(() => cssnano(), {
      message: 'cssnano.config.js: stop',
    });
  });

  test('a configuration file can import a local module and export its options', async () => {
    writeFileSync(
      `${temporaryDirectory}/local-options.mjs`,
      `import lite from ${presetImport('lite')};\nexport default { preset: lite, disable: ['discardComments'] };\n`
    );
    writeFileSync(
      `${temporaryDirectory}/local-config.mjs`,
      `import options from './local-options.mjs';\nexport default options;\n`
    );
    const result = await postcss([
      cssnano({ configFile: 'local-config.mjs' }),
    ]).process('/* note */h1{color:red}', { from: undefined });
    assert.strictEqual(result.css, '/* note */h1{color:red}');
  });
});
