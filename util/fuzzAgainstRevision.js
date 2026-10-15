import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FAILURE_EXIT_CODE } from './fuzzRunner.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const usage =
  'usage: node util/fuzzAgainstRevision.js <pkg> <rev> [-- <fuzz options>]';

/**
 * Only the runner's failure code is evidence that the check caught a bug; any
 * other non-zero exit means the fuzzer never ran to a verdict.
 *
 * @param {{ status: number | null, signal: NodeJS.Signals | null }} result
 * @return {string}
 */
export function describeOutcome({ status, signal }) {
  if (status === 0) {
    return 'passed';
  }
  if (status === FAILURE_EXIT_CODE) {
    return 'found a counterexample';
  }
  return `could not run (${signal ?? `exit ${status}`}); see the error above`;
}

/**
 * Runs a package's current fuzzer against the plugin `src` of an older commit.
 *
 * A fuzzer or bug fix is only evidence if the check fails before the fix and
 * passes after it. The current `script/` is copied beside the old `src` so the
 * check runs unchanged; the working tree is never modified.
 *
 * @param {string} pkg Package directory name, e.g. `postcss-convert-values`
 * @param {string} rev Any git revision, e.g. `HEAD~1`
 * @param {string[]} fuzzArgs Forwarded to the package's `script/fuzz.js`
 * @return {{ status: number | null, signal: NodeJS.Signals | null }}
 */
function fuzzAgainstRevision(pkg, rev, fuzzArgs = []) {
  const packageDir = join(root, 'packages', 'cssnano');
  const scriptDir = join(packageDir, 'script', pkg);
  if (!existsSync(join(scriptDir, 'fuzz.js'))) {
    throw new Error(`packages/cssnano/script/${pkg} has no fuzz.js`);
  }

  // A sibling of the real package keeps `../../src` and `#` imports resolving
  // as they do in the original location.
  const sandbox = join(root, 'packages', `.fuzz-rev-${pkg}-${process.pid}`);
  rmSync(sandbox, { recursive: true, force: true });
  try {
    mkdirSync(join(sandbox, 'script'), { recursive: true });
    cpSync(scriptDir, join(sandbox, 'script', pkg), { recursive: true });
    if (hasTree(rev, `packages/cssnano/src/plugins/${pkg}`)) {
      cpSync(join(packageDir, 'package.json'), join(sandbox, 'package.json'));
      symlinkSync(
        join(packageDir, 'node_modules'),
        join(sandbox, 'node_modules')
      );
      extractTree(rev, 'packages/cssnano/src', join(sandbox, 'src'));
    } else {
      installSeparatePackages(rev, pkg, sandbox, packageDir);
    }

    // A fresh process keeps module caching from mixing implementations.
    const run = spawnSync(
      process.execPath,
      [join(sandbox, 'script', pkg, 'fuzz.js'), ...fuzzArgs],
      { stdio: 'inherit' }
    );
    return { status: run.status, signal: run.signal };
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
}

/**
 * @param {string} rev
 * @param {string} path Repository-relative path
 * @return {boolean}
 */
function hasTree(rev, path) {
  return (
    spawnSync('git', ['cat-file', '-e', `${rev}:${path}`], { cwd: root })
      .status === 0
  );
}

/**
 * @param {string} rev
 * @param {string} path Repository-relative directory
 * @param {string} destination
 * @param {string[]} [entries] Limits the extraction to these children
 */
function extractTree(rev, path, destination, entries = []) {
  const archive = spawnSync(
    'git',
    ['archive', '--format=tar', `${rev}:${path}`, ...entries],
    { cwd: root, maxBuffer: 256 * 1024 * 1024 }
  );
  if (archive.status !== 0) {
    throw new Error(`git archive ${rev}:${path} failed: ${archive.stderr}`);
  }
  mkdirSync(destination, { recursive: true });
  const extract = spawnSync('tar', ['-x', '-C', destination], {
    input: archive.stdout,
  });
  if (extract.status !== 0) {
    throw new Error(`tar failed: ${extract.stderr}`);
  }
}

/**
 * Revisions from before the single-package move keep each plugin in its own
 * `packages/<name>` with workspace dependencies such as `cssnano-utils`. The
 * old plugin is placed where the current fuzzer expects it, and its workspace
 * dependencies become installed packages beside the real third-party ones.
 *
 * @param {string} rev
 * @param {string} pkg
 * @param {string} sandbox
 * @param {string} packageDir
 */
function installSeparatePackages(rev, pkg, sandbox, packageDir) {
  const pluginRoot = `packages/${pkg}`;
  if (!hasTree(rev, `${pluginRoot}/src`)) {
    throw new Error(`${rev} has neither ${pluginRoot} nor a ${pkg} plugin`);
  }
  const pluginDir = join('src', 'plugins', pkg);
  extractTree(rev, `${pluginRoot}/src`, join(sandbox, pluginDir));

  const manifest = JSON.parse(readManifest(rev, pkg));
  // The old `#getBrowsersList` targets are relative to the old package root.
  const imports = Object.fromEntries(
    Object.entries(manifest.imports ?? {}).map(([name, target]) => [
      name,
      relocate(target, pluginDir),
    ])
  );

  const installed = join(sandbox, 'node_modules');
  mkdirSync(installed);
  for (const entry of readdirSync(join(packageDir, 'node_modules'))) {
    symlinkSync(
      join(packageDir, 'node_modules', entry),
      join(installed, entry)
    );
  }
  const pending = workspaceDependencies(manifest);
  const seen = new Set();
  while (pending.length > 0) {
    const name = pending.pop();
    if (seen.has(name)) {
      continue;
    }
    seen.add(name);
    extractTree(rev, `packages/${name}`, join(installed, name), [
      'package.json',
      'src',
    ]);
    pending.push(...workspaceDependencies(JSON.parse(readManifest(rev, name))));
  }
  // The current fuzzers import the shared utilities through `#utils`.
  if (seen.has('cssnano-utils')) {
    imports['#utils'] = 'cssnano-utils';
  }

  writeFileSync(
    join(sandbox, 'package.json'),
    JSON.stringify({ name: pkg, type: 'module', imports })
  );
}

/**
 * @param {string} rev
 * @param {string} name
 * @return {string}
 */
function readManifest(rev, name) {
  const manifest = spawnSync(
    'git',
    ['show', `${rev}:packages/${name}/package.json`],
    { cwd: root, encoding: 'utf8' }
  );
  if (manifest.status !== 0) {
    throw new Error(`${rev} has no packages/${name}/package.json`);
  }
  return manifest.stdout;
}

/**
 * @param {{ dependencies?: Record<string, string> }} manifest
 * @return {string[]}
 */
function workspaceDependencies({ dependencies = {} }) {
  return Object.entries(dependencies)
    .filter(([, range]) => range.startsWith('workspace:'))
    .map(([name]) => name);
}

/**
 * @param {unknown} target A package `imports` target
 * @param {string} directory Where the old `src` now lives, relative to root
 * @return {unknown}
 */
function relocate(target, directory) {
  if (typeof target === 'string') {
    return target.replace(/^\.\/src\//v, `./${directory}/`);
  }
  return Object.fromEntries(
    Object.entries(target).map(([condition, nested]) => [
      condition,
      relocate(nested, directory),
    ])
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [pkg, rev, ...rest] = process.argv.slice(2);
  if (!pkg || !rev) {
    console.error(usage);
    process.exit(2);
  }
  try {
    const result = fuzzAgainstRevision(
      pkg,
      rev,
      rest.filter((argument) => argument !== '--')
    );
    console.log(`fuzz against ${rev}: ${describeOutcome(result)}`);
    process.exit(result.status ?? 1);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(2);
  }
}
