import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';

const cssnanoEntry = fileURLToPath(new URL('../src/index.js', import.meta.url));
const warningCode = 'CSSNANO_INSTALLED_PRESET';

/**
 * Builds cssnano with each preset in a fresh Node process, so that NODE_PATH
 * can make a stand-in preset package resolvable, and collects the warnings.
 *
 * @param {unknown[]} presets
 * @param {string} [nodePath]
 * @returns {{ code: string, message: string }[]}
 */
function warningsFor(presets, nodePath) {
  const script = `
    const warnings = [];
    process.on('warning', (w) => warnings.push({ code: w.code, message: w.message }));
    const { default: cssnano } = await import(${JSON.stringify(cssnanoEntry)});
    for (const preset of ${JSON.stringify(presets)}) cssnano({ preset });
    setImmediate(() => console.log(JSON.stringify(warnings)));
  `;
  const env = { ...process.env, NODE_PATH: nodePath ?? '' };
  const child = spawnSync(
    process.execPath,
    ['--input-type=module', '--eval', script],
    { env, encoding: 'utf8' }
  );
  assert.strictEqual(child.status, 0, child.stderr);
  return JSON.parse(child.stdout).filter(
    (/** @type {{ code: string }} */ w) => w.code === warningCode
  );
}

const stubPreset = 'module.exports = () => ({ plugins: [] });';
const throwingPreset =
  'module.exports = () => { throw new Error("installed package loaded"); };';

/**
 * @param {string} directory
 * @param {string} name
 * @param {string} source
 */
function writePackage(directory, name, source) {
  const packageDirectory = path.join(directory, name);
  mkdirSync(packageDirectory);
  writeFileSync(path.join(packageDirectory, 'index.js'), source);
}

describe('installed preset shadowing a built-in preset', () => {
  /** @type {string} */
  let nodePath;

  before(() => {
    nodePath = mkdtempSync(path.join(tmpdir(), 'cssnano-installed-preset-'));
    writePackage(nodePath, 'cssnano-preset-advanced', stubPreset);
    // Loading these would fail the build, proving cssnano ignores them.
    writePackage(nodePath, 'cssnano-preset-default', throwingPreset);
    writePackage(nodePath, 'advanced', throwingPreset);
    writePackage(nodePath, 'lite', throwingPreset);
  });

  after(() => {
    rmSync(nodePath, { recursive: true, force: true });
  });

  test('warns when the shorthand name loads the installed package', () => {
    const warnings = warningsFor(['advanced'], nodePath);
    assert.strictEqual(warnings.length, 1);
    assert.match(warnings[0].message, /cssnano-preset-advanced/v);
  });

  test('ignores installed packages named after the shorthands', () => {
    const warnings = warningsFor(['lite'], nodePath);
    assert.deepStrictEqual(warnings, []);
  });

  test('ignores an installed cssnano-preset-default for the default preset', () => {
    const warnings = warningsFor(['default'], nodePath);
    assert.deepStrictEqual(warnings, []);
  });

  test('warns when the full package name loads the installed package', () => {
    const warnings = warningsFor(['cssnano-preset-advanced'], nodePath);
    assert.strictEqual(warnings.length, 1);
  });

  test('warns once per process for repeated builds', () => {
    const warnings = warningsFor(
      ['advanced', 'cssnano-preset-advanced', ['advanced', {}]],
      nodePath
    );
    assert.strictEqual(warnings.length, 1);
  });

  test('does not warn when no package is installed and the built-in preset loads', () => {
    const warnings = warningsFor([
      'advanced',
      'cssnano-preset-lite',
      'default',
    ]);
    assert.deepStrictEqual(warnings, []);
  });
});
