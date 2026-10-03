import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync, symlinkSync } from 'node:fs';
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
  const packageDir = join(root, 'packages', pkg);
  if (!existsSync(join(packageDir, 'script', 'fuzz.js'))) {
    throw new Error(`packages/${pkg} has no script/fuzz.js`);
  }

  // A sibling of the real package keeps `../../util` and workspace imports
  // resolving as they do in the original location.
  const sandbox = join(root, 'packages', `.fuzz-rev-${pkg}-${process.pid}`);
  rmSync(sandbox, { recursive: true, force: true });
  try {
    mkdirSync(sandbox);
    for (const entry of ['script', 'package.json']) {
      cpSync(join(packageDir, entry), join(sandbox, entry), {
        recursive: true,
      });
    }
    symlinkSync(
      join(packageDir, 'node_modules'),
      join(sandbox, 'node_modules')
    );

    const archive = spawnSync(
      'git',
      ['archive', '--format=tar', `${rev}:packages/${pkg}/src`],
      { cwd: root, maxBuffer: 256 * 1024 * 1024 }
    );
    if (archive.status !== 0) {
      throw new Error(
        `git archive ${rev}:packages/${pkg}/src failed: ${archive.stderr}`
      );
    }
    mkdirSync(join(sandbox, 'src'));
    const extract = spawnSync('tar', ['-x', '-C', join(sandbox, 'src')], {
      input: archive.stdout,
    });
    if (extract.status !== 0) {
      throw new Error(`tar failed: ${extract.stderr}`);
    }

    // A fresh process keeps module caching from mixing implementations.
    const run = spawnSync(
      process.execPath,
      [join(sandbox, 'script', 'fuzz.js'), ...fuzzArgs],
      { stdio: 'inherit' }
    );
    return { status: run.status, signal: run.signal };
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
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
