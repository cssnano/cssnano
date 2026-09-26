/**
 * Print the exact uncovered branches for one workspace package.
 *
 * Runs the package test suite with `node --test
 * --experimental-test-coverage` and an lcov reporter, then renders every
 * 0-hit BRDA entry with its block/branch indices and a source snippet.
 *
 * Usage:
 *   node util/uncovered-branches.mjs packages/<pkg> [node --test args...]
 *
 * Examples:
 *   node util/uncovered-branches.mjs packages/postcss-merge-longhand
 *   node util/uncovered-branches.mjs packages/cssnano --test-name-pattern=config
 *   node util/uncovered-branches.mjs packages/postcss-colormin --save-lcov=lcov.info
 */

import { spawn } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import process from 'node:process';
import { once } from 'node:events';

const SKIP_PATTERN_DEFAULT = 'framework tests';
const lcovTaken = (entry) => entry.taken === '0';

function usage() {
  console.error(
    'Usage: node util/uncovered-branches.mjs packages/<pkg> [node --test args...]\n' +
      '       --save-lcov=<path> also writes the raw lcov report to <path>'
  );
}

function parseArgs(argv) {
  const extra = [];
  let packageArg;
  let saveLcov;
  for (const arg of argv) {
    if (arg.startsWith('--save-lcov=')) {
      saveLcov = arg.slice('--save-lcov='.length);
    } else if (!arg.startsWith('-') && packageArg === undefined) {
      packageArg = arg;
    } else {
      extra.push(arg);
    }
  }
  return { extra, packageArg, saveLcov };
}

async function runCoverageTests(packageDir, extraArgs, lcovPath) {
  const args = [
    '--test',
    '--experimental-test-coverage',
    '--test-reporter=lcov',
    `--test-reporter-destination=${lcovPath}`,
    `--test-skip-pattern=${SKIP_PATTERN_DEFAULT}`,
    ...extraArgs,
  ];
  const child = spawn(process.execPath, args, {
    cwd: packageDir,
    stdio: 'inherit',
  });
  try {
    const [code] = await once(child, 'close');
    return code ?? 1;
  } catch {
    // Spawn failures surface through the 'error' event instead of 'close'.
    return 1;
  }
}

function parseLcov(text) {
  const files = [];
  let current;
  for (const line of text.split('\n')) {
    if (line.startsWith('SF:')) {
      current = {
        branchEntries: [],
        branchHits: 0,
        branchTotal: 0,
        path: line.slice(3),
      };
    } else if (!current) {
      continue;
    } else if (line.startsWith('BRDA:')) {
      const [lineNo, block, branch, taken] = line.slice(5).split(',');
      current.branchEntries.push({
        block,
        branch,
        line: Number.parseInt(lineNo, 10),
        taken,
      });
    } else if (line.startsWith('BRF:')) {
      current.branchTotal = Number.parseInt(line.slice(4), 10);
    } else if (line.startsWith('BRH:')) {
      current.branchHits = Number.parseInt(line.slice(4), 10);
    } else if (line === 'end_of_record') {
      files.push(current);
      current = undefined;
    }
  }
  return files;
}

function printSnippet(sourceLines, target) {
  const first = Math.max(1, target - 1);
  const last = Math.min(sourceLines.length, target + 1);
  const gutter = String(last).length;
  for (let n = first; n <= last; n++) {
    const marker = n === target ? '  >' : '   ';
    const text = sourceLines[n - 1] ?? '';
    console.log(`${marker} ${String(n).padStart(gutter, ' ')} | ${text}`);
  }
}

function printFileReport(record, displayPath) {
  const uncovered = record.branchEntries.filter(lcovTaken);
  console.log(
    `\n${displayPath} — ${uncovered.length} of ${record.branchTotal} branches uncovered`
  );

  const byLine = new Map();
  for (const entry of uncovered) {
    const group = byLine.get(entry.line);
    if (group) {
      group.push(entry);
    } else {
      byLine.set(entry.line, [entry]);
    }
  }

  const source = record.sourceLines;
  const numbers = [...byLine.keys()].toSorted((a, b) => a - b);
  for (const line of numbers) {
    const group = byLine.get(line);
    const slots = group
      .map((entry) => `block ${entry.block} branch ${entry.branch}`)
      .join(', ');
    console.log(`  line ${line} (${slots}, taken 0)`);
    if (source) {
      printSnippet(source, line);
    }
  }
}

function printReport(files, packageDir, repoRoot, testExit) {
  const label = relative(repoRoot, packageDir) || '.';
  console.log(`\n== Branch coverage for ${label} ==`);

  if (files.length === 0) {
    console.log(
      'No coverage data found. No test files may have run; check the test output above.'
    );
    return;
  }

  const filesWithBranches = files.filter((record) => record.branchTotal > 0);
  const branchTotal = filesWithBranches.reduce(
    (sum, record) => sum + record.branchTotal,
    0
  );
  const uncoveredFiles = filesWithBranches.filter((record) =>
    record.branchEntries.some(lcovTaken)
  );
  const uncoveredCount = uncoveredFiles.reduce(
    (sum, record) => sum + record.branchEntries.filter(lcovTaken).length,
    0
  );

  const sorted = [...uncoveredFiles].toSorted((a, b) =>
    a.path.localeCompare(b.path)
  );
  for (const record of sorted) {
    const recordLabel =
      relative(repoRoot, join(packageDir, record.path)) || record.path;
    printFileReport(record, recordLabel);
  }

  if (uncoveredCount === 0) {
    console.log(
      `\nAll ${branchTotal} branches across ${files.length} files are covered.`
    );
  } else {
    console.log(
      `\n${uncoveredCount} uncovered branches in ${uncoveredFiles.length} of ` +
        `${filesWithBranches.length} branch-holding files`
    );
  }
  if (testExit !== 0) {
    console.log(
      `(note: the test run exited with ${testExit}; results may be incomplete)`
    );
  }
}

async function attachSnippets(files, packageDir) {
  for (const record of files) {
    const absolutePath = join(packageDir, record.path);
    try {
      const text = await readFile(absolutePath, 'utf8');
      record.sourceLines = text.split('\n');
    } catch {
      record.sourceLines = undefined;
    }
  }
}

async function main() {
  const repoRoot = resolve(import.meta.dirname, '..');
  const { extra, packageArg, saveLcov } = parseArgs(process.argv.slice(2));
  if (!packageArg) {
    usage();
    process.exit(1);
  }
  const packageDir = resolve(packageArg);

  const tempDir = await mkdtemp(join(tmpdir(), 'uncovered-branches-'));
  const lcovPath = join(tempDir, 'lcov.info');
  try {
    console.log(
      `Running: node --test --experimental-test-coverage --test-reporter=lcov (cwd: ${packageDir})`
    );
    const testExit = await runCoverageTests(packageDir, extra, lcovPath);

    let text;
    try {
      text = await readFile(lcovPath, 'utf8');
    } catch (error) {
      console.error(`Could not read generated lcov report: ${error?.message}`);
      process.exit(1);
    }

    if (saveLcov) {
      await mkdir(dirname(saveLcov), { recursive: true });
      await copyFile(lcovPath, saveLcov);
      console.log(`Raw lcov report saved to ${saveLcov}`);
    }

    const files = parseLcov(text);
    await attachSnippets(files, packageDir);
    printReport(files, packageDir, repoRoot, testExit);
    process.exitCode = testExit;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

await main();
