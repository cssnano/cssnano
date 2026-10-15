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
  const result = spawnSync(process.execPath, ['runner.mjs'], {
    cwd: installDir,
    input: JSON.stringify(input),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

const runnerSource = `
import { readFileSync } from 'node:fs';
const { default: postcss } = await import('postcss');
const { default: cssnano } = await import('cssnano');
const { css, options } = JSON.parse(readFileSync(0, 'utf8'));
const result = await postcss([cssnano(options)]).process(css, { from: undefined });
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

  test('exports lists only the root and package.json', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    assert.deepEqual(Object.keys(manifest.exports), ['.', './package.json']);
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
      'caniuse-api',
      'postcss-calc',
    ]);
    assert.deepEqual(Object.keys(manifest.peerDependencies), ['postcss']);
  });

  test('preset "default" works', () => {
    const output = runInstalled(installDir, {
      css: `h1{content:"©"}`,
      options: { preset: ['default', { normalizeCharset: { add: true } }] },
    });
    assert.equal(output, `@charset "utf-8";h1{content:"©"}`);
  });

  test('preset "lite" works without cssnano-preset-lite installed', () => {
    const output = runInstalled(installDir, {
      css: liteInput,
      options: { preset: 'lite' },
    });
    assert.equal(output, liteOutput);
  });

  test('preset "advanced" works without cssnano-preset-advanced installed', () => {
    const output = runInstalled(installDir, {
      css: advancedInput,
      options: { preset: 'advanced' },
    });
    assert.equal(output, advancedOutput);
  });

  test('preset "cssnano-preset-default" works without the package installed', () => {
    const output = runInstalled(installDir, {
      css: `h1{content:"©"}`,
      options: { preset: 'cssnano-preset-default' },
    });
    assert.equal(output, `h1{content:"©"}`);
  });

  test('preset "cssnano-preset-lite" works without the package installed', () => {
    const output = runInstalled(installDir, {
      css: liteInput,
      options: { preset: 'cssnano-preset-lite' },
    });
    assert.equal(output, liteOutput);
  });

  test('preset "cssnano-preset-advanced" works without the package installed', () => {
    const output = runInstalled(installDir, {
      css: advancedInput,
      options: { preset: 'cssnano-preset-advanced' },
    });
    assert.equal(output, advancedOutput);
  });
});

describe('installed presets', () => {
  /** @type {string} */
  let installDir;

  before(() => {
    installDir = mkdtempSync(path.join(tmpdir(), 'cssnano-presets-'));
    packAndInstall(installDir);
    writeFileSync(path.join(installDir, 'runner.mjs'), runnerSource);

    // An installed preset named like a built-in one must win over the built-in.
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

  test('an installed cssnano-preset-lite takes precedence over the built-in', () => {
    const input = `a { color: red; }`;
    const output = runInstalled(installDir, {
      css: input,
      options: { preset: 'lite' },
    });
    assert.equal(output, input);
  });

  test('a third-party preset string resolves through the module resolver', () => {
    const output = runInstalled(installDir, {
      css: `a{color:red}`,
      options: { preset: 'cssnano-third-party' },
    });
    assert.equal(output, `.third{color:red}`);
  });
});
