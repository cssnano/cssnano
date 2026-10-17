import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import process from 'node:process';
import { afterEach, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import litePreset from '#presets/lite';
import defaultPreset from '#presets/default';
import cssnano from '../../src/index.js';
import { presetRequire } from './presetSpecifiers.js';

describe('cssnano configuration file interop', () => {
  let temporaryDirectory;
  let previousWorkingDirectory;

  beforeEach(() => {
    temporaryDirectory = mkdtempSync(`${tmpdir()}/cssnano-config-interop-`);
    previousWorkingDirectory = process.cwd();
    process.chdir(temporaryDirectory);
  });

  afterEach(() => {
    process.chdir(previousWorkingDirectory);
    rmSync(temporaryDirectory, { recursive: true, force: true });
  });

  test('unwraps the default export of a CommonJS module that Babel or TypeScript compiled from ES modules', () => {
    writeFileSync(
      `${temporaryDirectory}/config.cjs`,
      `const lite = require(${presetRequire('lite')});\nObject.defineProperty(exports, '__esModule', { value: true });\nexports.default = { preset: lite };\n`
    );
    assert.strictEqual(
      postcss([cssnano({ configFile: 'config.cjs' })]).plugins.length,
      litePreset().length
    );
  });

  test('an inline browserslist.env replaces the query of the configuration file, because browserslist reads env only without a query', async () => {
    writeFileSync(
      `${temporaryDirectory}/cssnano.config.js`,
      'export default { browserslist: { query: "chrome 120" } };'
    );
    writeFileSync(`${temporaryDirectory}/.browserslistrc`, '[legacy]\nie 11\n');
    const input = 'a{align-items:center;justify-items:start}';
    const from = `${temporaryDirectory}/app.css`;
    const css = async (processor) =>
      (await processor.process(input, { from })).css;
    const chrome = await css(
      postcss(defaultPreset({ browserslist: { query: 'chrome 120' } }))
    );
    const ie = await css(
      postcss(defaultPreset({ browserslist: { query: 'ie 11' } }))
    );
    // The two targets must minify differently, or the comparison below proves nothing.
    assert.notEqual(chrome, ie);
    assert.strictEqual(
      await css(postcss([cssnano({ browserslist: { env: 'legacy' } })])),
      ie
    );
  });

  test('an inline browserslist.config replaces the query of the configuration file, because browserslist reads a config only without a query', () => {
    writeFileSync(
      `${temporaryDirectory}/cssnano.config.js`,
      'export default { browserslist: { query: "chrome 120" } };'
    );
    const processor = postcss([
      cssnano({ browserslist: { config: './missing.browserslistrc' } }),
    ]);
    assert.throws(() => processor.process('a{}', { from: undefined }).css, {
      message: /missing\.browserslistrc/v,
    });
  });

  test('an inline browserslist.path replaces the query of the configuration file, because browserslist searches a path only without a query', async () => {
    writeFileSync(
      `${temporaryDirectory}/cssnano.config.js`,
      'export default { browserslist: { query: "chrome 120" } };'
    );
    mkdirSync(`${temporaryDirectory}/legacy`);
    writeFileSync(`${temporaryDirectory}/legacy/.browserslistrc`, 'ie 11\n');
    const input = 'a{align-items:center;justify-items:start}';
    const css = async (processor) =>
      (await processor.process(input, { from: undefined })).css;
    const ie = await css(
      postcss(defaultPreset({ browserslist: { query: 'ie 11' } }))
    );
    assert.strictEqual(
      await css(
        postcss([
          cssnano({
            browserslist: { path: `${temporaryDirectory}/legacy` },
          }),
        ])
      ),
      ie
    );
  });
});
