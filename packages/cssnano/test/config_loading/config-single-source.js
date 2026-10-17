import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import process from 'node:process';
import { afterEach, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import litePreset from '#presets/lite';
import cssnano from '../../src/index.js';
import { presetImport } from './presetSpecifiers.js';

describe('options from one source', () => {
  let temporaryDirectory;
  let previousWorkingDirectory;

  beforeEach(() => {
    temporaryDirectory = mkdtempSync(`${tmpdir()}/cssnano-single-`);
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

  test('inline browserslist skips the configuration file, so the default preset runs', async () => {
    const result = await postcss([
      cssnano({ browserslist: { query: 'defaults' } }),
    ]).process('h1{color:#ffffff}', { from: undefined });
    assert.strictEqual(result.css, 'h1{color:#fff}');
  });

  test('inline browserslist.path is not overridden by the browserslist.config of the file', () => {
    writeFileSync(
      `${temporaryDirectory}/cssnano.config.js`,
      "export default { browserslist: { config: './a/.browserslistrc' } };"
    );
    assert.doesNotThrow(() => cssnano({ browserslist: { query: 'defaults' } }));
  });

  test('inline disable without a preset disables the plugin of the default preset', async () => {
    const result = await postcss([cssnano({ disable: ['colormin'] })]).process(
      'h1{color:#ffffff}',
      { from: undefined }
    );
    assert.strictEqual(result.css, 'h1{color:#ffffff}');
  });

  test('inline options without a preset configure a plugin of the default preset', () => {
    assert.doesNotThrow(() =>
      cssnano({ options: { discardComments: { removeAll: true } } })
    );
  });

  test('a string as the options throws, instead of being read character by character', () => {
    assert.throws(() => cssnano('lite'), {
      name: 'TypeError',
      message: 'The cssnano options must be an object.',
    });
  });

  test('null options throw, because only undefined selects the defaults', () => {
    assert.throws(() => cssnano(null), TypeError);
  });

  test('an unknown inline key throws', () => {
    assert.throws(() => cssnano({ presett: litePreset }), {
      name: 'TypeError',
      message: '"presett" is not an option of cssnano options.',
    });
  });

  test('a removed disable entry throws and names its replacement', () => {
    assert.throws(() => cssnano({ disable: ['svgo'] }), {
      name: 'TypeError',
      message:
        '"svgo" in disable was removed; run postcss-svgo before cssnano.',
    });
  });

  test('a plugin that the preset does not run throws in disable', () => {
    assert.throws(() => cssnano({ preset: litePreset, disable: ['zindex'] }), {
      message: '"zindex" in disable is not a plugin that the preset runs.',
    });
  });

  test('an unknown key in the configuration file throws and names the file', () => {
    writeFileSync(
      `${temporaryDirectory}/cssnano.config.js`,
      'export default { presett: 1 };'
    );
    assert.throws(() => cssnano(), {
      message:
        'cssnano.config.js: "presett" is not an option of a configuration file.',
    });
  });
});
