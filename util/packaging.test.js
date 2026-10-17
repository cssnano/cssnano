import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { before, describe, test } from 'node:test';

/**
 * Packs the cssnano package and installs the tarball into empty directories,
 * so the tests see what users get from npm rather than the workspace.
 */

const cssnanoDir = fileURLToPath(
  new URL('../packages/cssnano', import.meta.url)
);

/**
 * @param {string} installDir
 * @returns {string} path of the installed `package.json`
 */
function packAndInstall(installDir) {
  const packDir = mkdtempSync(path.join(tmpdir(), 'cssnano-pack-'));
  execFileSync('pnpm', ['pack', '--pack-destination', packDir], {
    cwd: cssnanoDir,
    stdio: 'pipe',
  });
  const tarball = readdirSync(packDir).find((f) => f.endsWith('.tgz'));
  writeFileSync(
    path.join(installDir, 'package.json'),
    JSON.stringify({ private: true })
  );
  execFileSync(
    'npm',
    [
      'install',
      path.join(packDir, tarball),
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
    ],
    { cwd: installDir, stdio: 'pipe' }
  );
  return path.join(installDir, 'node_modules/cssnano/package.json');
}

/**
 * Runs cssnano from the installed package, in a child process so the test
 * process cannot resolve presets from the workspace.
 *
 * @param {string} installDir
 * @param {{ css: string, options: object }} input
 * @returns {string} output CSS
 */
function runInstalled(installDir, input) {
  const result = runInstalledResult(installDir, input);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

/**
 * @param {string} installDir
 * @param {{ css: string, options: object }} input
 * @returns {import('node:child_process').SpawnSyncReturns<string>}
 */
function runInstalledResult(installDir, input) {
  return spawnSync(process.execPath, ['runner.mjs'], {
    cwd: installDir,
    input: JSON.stringify(input),
    encoding: 'utf8',
  });
}

const runnerSource = `
import { readFileSync } from 'node:fs';
const { default: postcss } = await import('postcss');
const { default: cssnano } = await import('cssnano');
const { css, options = {}, preset } = JSON.parse(readFileSync(0, 'utf8'));
// A built preset is imported from the package, as a user imports it.
const imported = preset === undefined ? {} : { preset: (await import(\`cssnano/presets/\${preset}\`)).default };
const result = await postcss([cssnano({ ...options, ...imported })]).process(css, { from: undefined });
for (const warning of result.warnings()) process.stderr.write(warning.text + '\\n');
process.stdout.write(result.css);
`;

const importedLiteRunnerSource = `
import postcss from 'postcss';
import cssnano from 'cssnano';
import litePreset from 'cssnano/presets/lite';
import { readFileSync } from 'node:fs';
const css = readFileSync(0, 'utf8');
const result = await postcss(litePreset()).process(css, { from: undefined });
process.stdout.write(result.css);
`;

const liteInput = `.example {
    display: grid;
    transition: all .5s;
    user-select: none;
    background: linear-gradient(to bottom, white, black);
}
`;
const liteOutput = `.example{display:grid;transition:all .5s;user-select:none;background:linear-gradient(to bottom,white,black)}`;

const advancedInput = `h1{z-index:10}`;
const advancedOutput = `h1{z-index:1}`;

describe('published package', () => {
  /** @type {string} */
  let manifestPath;
  /** @type {string} */
  let installDir;

  before(() => {
    installDir = mkdtempSync(path.join(tmpdir(), 'cssnano-install-'));
    manifestPath = packAndInstall(installDir);
    writeFileSync(path.join(installDir, 'runner.mjs'), runnerSource);
  });

  test('exports lists the root, the built-in presets and package.json', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    assert.deepEqual(Object.keys(manifest.exports), [
      '.',
      './presets/advanced',
      './presets/default',
      './presets/lite',
      './package.json',
    ]);
  });

  test('main and types point at files in the package', () => {
    const packageDir = path.dirname(manifestPath);
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    assert.ok(
      readFileSync(path.join(packageDir, manifest.main), 'utf8').length > 0
    );
    assert.ok(
      readFileSync(path.join(packageDir, manifest.types), 'utf8').length > 0
    );
  });

  test('no workspace: or catalog: specifier is published', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const specifiers = [
      manifest.dependencies,
      manifest.devDependencies,
      manifest.peerDependencies,
      manifest.optionalDependencies,
    ].flatMap((deps) => Object.values(deps ?? {}));
    assert.deepEqual(
      specifiers.filter((s) => /^(workspace|catalog):/v.test(s)),
      []
    );
  });

  test('runtime dependencies are the five cssnano needs, plus postcss as a peer', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    assert.deepEqual(Object.keys(manifest.dependencies).toSorted(), [
      '@colordx/core',
      '@csstools/css-tokenizer',
      'browserslist',
      'caniuse-lite',
      'postcss-calc',
    ]);
    assert.deepEqual(Object.keys(manifest.peerDependencies), ['postcss']);
  });

  test('preset "default" works', () => {
    const output = runInstalled(installDir, {
      css: `h1{content:"©"}`,
      preset: 'default',
      options: { options: { normalizeCharset: { add: true } } },
    });
    assert.equal(output, `@charset "utf-8";h1{content:"©"}`);
  });

  test('preset "lite" works without cssnano-preset-lite installed', () => {
    const output = runInstalled(installDir, {
      css: liteInput,
      preset: 'lite',
    });
    assert.equal(output, liteOutput);
  });

  test('preset "advanced" works without cssnano-preset-advanced installed', () => {
    const output = runInstalled(installDir, {
      css: advancedInput,
      preset: 'advanced',
    });
    assert.equal(output, advancedOutput);
  });

  test('preset "cssnano-preset-lite" throws, instead of running the installed package', () => {
    const result = runInstalledResult(installDir, {
      css: liteInput,
      options: { preset: 'cssnano-preset-lite' },
    });
    assert.notEqual(result.status, 0);
    assert.match(
      result.stderr,
      /Option "preset" must be a preset imported from cssnano/v
    );
  });

  test('preset "cssnano-preset-default" throws, instead of running the installed package', () => {
    const result = runInstalledResult(installDir, {
      css: `h1{content:"©"}`,
      options: { preset: 'cssnano-preset-default' },
    });
    assert.notEqual(result.status, 0);
    assert.match(
      result.stderr,
      /Option "preset" must be a preset imported from cssnano/v
    );
  });

  test('preset "cssnano-preset-advanced" throws, instead of running the installed package', () => {
    const result = runInstalledResult(installDir, {
      css: advancedInput,
      options: { preset: 'cssnano-preset-advanced' },
    });
    assert.notEqual(result.status, 0);
    assert.match(
      result.stderr,
      /Option "preset" must be a preset imported from cssnano/v
    );
  });

  test('an imported preset from cssnano/presets/lite runs without a configuration file', () => {
    writeFileSync(
      path.join(installDir, 'imported-preset-runner.mjs'),
      importedLiteRunnerSource
    );
    const result = spawnSync(process.execPath, ['imported-preset-runner.mjs'], {
      cwd: installDir,
      input: liteInput,
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, liteOutput);
  });
});

describe('installed packages named like presets', () => {
  /** @type {string} */
  let installDir;

  before(() => {
    installDir = mkdtempSync(path.join(tmpdir(), 'cssnano-presets-'));
    packAndInstall(installDir);
    writeFileSync(path.join(installDir, 'runner.mjs'), runnerSource);

    // An installed package named like a built-in preset must not change it.
    const liteDir = path.join(installDir, 'node_modules/cssnano-preset-lite');
    mkdirSync(liteDir, { recursive: true });
    writeFileSync(
      path.join(liteDir, 'package.json'),
      JSON.stringify({ name: 'cssnano-preset-lite', main: 'index.js' })
    );
    writeFileSync(
      path.join(liteDir, 'index.js'),
      'module.exports = function () { return { plugins: [] }; };'
    );

    // A third-party preset, resolved by its module name.
    const thirdDir = path.join(installDir, 'node_modules/cssnano-third-party');
    mkdirSync(thirdDir, { recursive: true });
    writeFileSync(
      path.join(thirdDir, 'package.json'),
      JSON.stringify({ name: 'cssnano-third-party', main: 'index.js' })
    );
    writeFileSync(
      path.join(thirdDir, 'index.js'),
      `module.exports = function () {
  return {
    plugins: [[() => ({ postcssPlugin: 'mark', Rule(rule) { rule.selector = '.third'; } }), {}]],
  };
};`
    );
  });

  test('an installed cssnano-preset-lite does not change the built-in lite preset', () => {
    const output = runInstalled(installDir, {
      css: liteInput,
      preset: 'lite',
    });
    assert.equal(output, liteOutput);
  });

  test('a third-party preset name throws, instead of resolving through node_modules', () => {
    const result = runInstalledResult(installDir, {
      css: `a{color:red}`,
      options: { preset: 'cssnano-third-party' },
    });
    assert.notEqual(result.status, 0);
    assert.match(
      result.stderr,
      /Option "preset" must be a preset imported from cssnano/v
    );
  });
});
