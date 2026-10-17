import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';

// A file URL, because import() rejects Windows drive-letter paths.
const cssnanoEntry = new URL('../src/index.js', import.meta.url).href;
// The child runs from a temporary directory, so it needs postcss by URL.
const postcssEntry = import.meta.resolve('postcss');
const litePresetEntry = new URL('../src/presets/lite.js', import.meta.url).href;

// Empties the output, so a fake preset that wins is visible in the result.
const fakePreset = 'module.exports = () => ({ plugins: [] });';

/**
 * Runs cssnano in a fresh process where NODE_PATH makes the fake package
 * resolvable, and returns the output CSS, the warnings, or the error message.
 *
 * @param {string} presetExpression a JavaScript expression for the preset option
 * @param {string} nodePath
 * @returns {{ css?: string, warnings?: string[], error?: string }}
 */
function runWithFakePackage(presetExpression, nodePath) {
  const script = `
    const { default: postcss } = await import(${JSON.stringify(postcssEntry)});
    const { default: cssnano } = await import(${JSON.stringify(cssnanoEntry)});
    const preset = ${presetExpression};
    try {
      const result = await postcss([cssnano({ preset })])
        .process('a{color:red}', { from: undefined });
      console.log(JSON.stringify({ css: result.css, warnings: result.warnings().map((warning) => warning.text) }));
    } catch (error) {
      console.log(JSON.stringify({ error: error.message }));
    }
  `;
  const child = spawnSync(
    process.execPath,
    ['--input-type=module', '--eval', script],
    {
      cwd: nodePath,
      env: { ...process.env, NODE_PATH: nodePath },
      encoding: 'utf8',
    }
  );
  assert.strictEqual(child.status, 0, child.stderr);
  return JSON.parse(child.stdout);
}

describe('preset names never resolve from node_modules', () => {
  /** @type {string} */
  let nodePath;

  before(() => {
    nodePath = mkdtempSync(path.join(tmpdir(), 'cssnano-no-resolve-'));
    const packageDirectory = path.join(nodePath, 'cssnano-preset-lite');
    mkdirSync(packageDirectory);
    writeFileSync(path.join(packageDirectory, 'index.js'), fakePreset);
    writeFileSync(
      path.join(packageDirectory, 'package.json'),
      JSON.stringify({ name: 'cssnano-preset-lite', main: 'index.js' })
    );
  });

  after(() => {
    rmSync(nodePath, { recursive: true, force: true });
  });

  test('the imported lite preset runs the built-in preset, not the installed package', () => {
    const { css, error } = runWithFakePackage(
      `(await import(${JSON.stringify(litePresetEntry)})).default`,
      nodePath
    );
    assert.strictEqual(error, undefined);
    assert.strictEqual(css, 'a{color:red}');
  });

  test('the cssnano-preset-lite name throws, instead of running the installed package or the default preset', () => {
    const { css, error } = runWithFakePackage(
      JSON.stringify('cssnano-preset-lite'),
      nodePath
    );
    assert.strictEqual(css, undefined);
    assert.match(
      error ?? '',
      /^Option "preset" must be a preset imported from cssnano/v
    );
  });
});
