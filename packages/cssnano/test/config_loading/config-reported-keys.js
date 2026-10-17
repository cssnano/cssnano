import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import process from 'node:process';
import { afterEach, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import defaultPreset from '#presets/default';
import litePreset from '#presets/lite';
import cssnano from '../../src/index.js';
import { presetImport } from './presetSpecifiers.js';

describe('cssnano config file with a reported top-level key', () => {
  let temporaryDirectory;
  let previousWorkingDirectory;

  beforeEach(() => {
    temporaryDirectory = mkdtempSync(`${tmpdir()}/cssnano-config-`);
    writeFileSync(
      `${temporaryDirectory}/cssnano.config.js`,
      `import lite from ${presetImport('lite')};\nexport default { preset: lite };\n`
    );
    previousWorkingDirectory = process.cwd();
    process.chdir(temporaryDirectory);
  });

  afterEach(() => {
    process.chdir(previousWorkingDirectory);
    rmSync(temporaryDirectory, { recursive: true, force: true });
  });

  test('a misspelled top-level key throws, and the configuration file is not rescued', () => {
    assert.throws(() => cssnano({ presett: 'default' }), {
      message: '"presett" is not an option of cssnano options.',
    });
  });

  test('a removed target key throws, because ignoring it would widen the targets', () => {
    assert.throws(
      () => cssnano({ path: './src' }),
      /Option "path" was removed/v
    );
  });

  test('a plugin name at the top level throws without a preset, so the setting is not dropped', () => {
    assert.throws(
      () => cssnano({ discardComments: false }),
      /"discardComments" is a plugin, not an option/v
    );
  });

  test('an advanced-only plugin name at the top level throws without a preset, not as an unknown key', () => {
    assert.throws(
      () => cssnano({ zindex: { startIndex: 2 } }),
      /"zindex" is a plugin, not an option/v
    );
  });

  test('empty disable and options without a preset set nothing, so they do not throw', () => {
    assert.doesNotThrow(() => cssnano({ disable: [], options: {} }));
  });

  test(
    'discovers no configuration file when the working directory was deleted, as in a long-running watcher',
    {
      skip:
        process.platform === 'win32' &&
        'Windows cannot delete the working directory',
    },
    () => {
      const deleted = mkdtempSync(`${tmpdir()}/cssnano-deleted-`);
      process.chdir(deleted);
      rmSync(deleted, { recursive: true });
      assert.strictEqual(
        postcss([cssnano]).plugins.length,
        defaultPreset().length
      );
    }
  );

  test('an inline plugin option whose value is undefined sets nothing, so the configuration file is read', () => {
    assert.strictEqual(
      postcss([cssnano({ options: { colormin: undefined } })]).plugins.length,
      litePreset().length
    );
  });

  test('an inline plugin option whose value is null sets nothing, so it may come with configFile', () => {
    writeFileSync(
      `${temporaryDirectory}/custom.js`,
      `import lite from ${presetImport('lite')};\nexport default { preset: lite };\n`
    );
    assert.strictEqual(
      postcss([
        cssnano({ configFile: 'custom.js', options: { colormin: null } }),
      ]).plugins.length,
      litePreset().length
    );
  });

  test('an empty inline browserslist keeps the targets of the configuration file', async () => {
    const result = await postcss([
      cssnano({ browserslist: { query: undefined } }),
    ]).process('h1{color:#ffffff}', { from: undefined });
    assert.strictEqual(result.css, 'h1{color:#ffffff}');
  });

  test('inline browserslist alone skips the configuration file, so the default preset runs and the hex is shortened', async () => {
    const result = await postcss([
      cssnano({ browserslist: { query: 'defaults' } }),
    ]).process('h1{color:#ffffff}', { from: undefined });
    assert.strictEqual(result.css, 'h1{color:#fff}');
  });

  test('inline browserslist alone skips the disable list of the configuration file', async () => {
    writeFileSync(
      `${temporaryDirectory}/cssnano.config.js`,
      `import lite from ${presetImport('lite')};\nexport default { preset: lite, disable: ['discardComments'] };\n`
    );
    const result = await postcss([
      cssnano({ browserslist: { query: 'defaults' } }),
    ]).process('/* note */h1{color:red}', { from: undefined });
    assert.strictEqual(result.css, 'h1{color:red}');
  });

  test('keeps the TypeError of an invalid option in a configuration file, and names the file', () => {
    writeFileSync(
      `${temporaryDirectory}/cssnano.config.js`,
      `import lite from ${presetImport('lite')};\nexport default { preset: lite, disable: 5 };\n`
    );
    assert.throws(() => cssnano(), TypeError);
    assert.throws(() => cssnano(), {
      message:
        /^cssnano\.config\.js: Option "disable" must be an array of strings\.$/v,
    });
  });

  test('a known inline key skips the configuration file', async () => {
    const result = await postcss([
      cssnano({ preset: defaultPreset, disable: ['discardComments'] }),
    ]).process('h1{color:#ffffff}', { from: undefined });
    assert.strictEqual(result.css, 'h1{color:#fff}');
  });

  test('an options key set to null is unset, so it needs no preset and the default preset runs', async () => {
    rmSync(`${temporaryDirectory}/cssnano.config.js`);
    const result = await postcss([cssnano({ options: null })]).process(
      'h1{color:#ffffff}',
      { from: undefined }
    );
    const defaults = await postcss(defaultPreset()).process(
      'h1{color:#ffffff}',
      { from: undefined }
    );
    assert.strictEqual(result.css, defaults.css);
  });

  test('a disable key set to null is unset, so it needs no preset either', async () => {
    rmSync(`${temporaryDirectory}/cssnano.config.js`);
    const result = await postcss([cssnano({ disable: null })]).process(
      'h1{color:#ffffff}',
      { from: undefined }
    );
    const defaults = await postcss(defaultPreset()).process(
      'h1{color:#ffffff}',
      { from: undefined }
    );
    assert.strictEqual(result.css, defaults.css);
  });

  test('inline browserslist with an unknown key throws, because ignoring it would change the targets', () => {
    assert.throws(
      () =>
        cssnano({ preset: defaultPreset, browserslist: { quer: 'defaults' } }),
      { message: '"quer" in browserslist is not an option.' }
    );
  });

  test('inline disable without a preset is checked against the default preset', () => {
    assert.throws(() => cssnano({ disable: ['zindex'] }), {
      message: '"zindex" in disable is not a plugin that the preset runs.',
    });
  });

  test('inline options without a preset configure the default preset', async () => {
    const result = await postcss([
      cssnano({ options: { discardComments: { removeAll: true } } }),
    ]).process('/*! keep */h1{color:red}', { from: undefined });
    assert.strictEqual(result.css, 'h1{color:red}');
  });

  test('inline browserslist without a preset is accepted, and runs the default preset with those targets', async () => {
    rmSync(`${temporaryDirectory}/cssnano.config.js`);
    const result = await postcss([
      cssnano({ browserslist: { query: 'defaults' } }),
    ]).process('h1{color:#ffffff}', { from: undefined });
    const expected = await postcss(
      defaultPreset({ browserslist: { query: 'defaults' } })
    ).process('h1{color:#ffffff}', { from: undefined });
    assert.strictEqual(result.css, expected.css);
  });

  test('a configuration file with disable and no preset is checked against the default preset, and names the file', () => {
    writeFileSync(
      `${temporaryDirectory}/cssnano.config.js`,
      'export default { disable: ["zindex"] };'
    );
    assert.throws(() => cssnano(), {
      message:
        'cssnano.config.js: "zindex" in disable is not a plugin that the preset runs.',
    });
  });

  test('plugin names in inline disable are checked against the inline preset, and the file is skipped', () => {
    assert.throws(
      () => cssnano({ preset: defaultPreset, disable: ['zindex'] }),
      { message: '"zindex" in disable is not a plugin that the preset runs.' }
    );
  });

  test('an inline plugin option with an unknown key throws, because the default would run instead of the setting', () => {
    assert.throws(
      () =>
        cssnano({
          preset: defaultPreset,
          options: { colormin: { notAnOption: 'ie 11' } },
        }),
      { message: '"notAnOption" in options.colormin is not an option.' }
    );
  });

  test('an empty disable list written inline still skips the configuration file', async () => {
    const result = await postcss([
      cssnano({ preset: defaultPreset, disable: [] }),
    ]).process('h1{color:#ffffff}', { from: undefined });
    assert.strictEqual(result.css, 'h1{color:#fff}');
  });
});
