import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { cpus, platform, release } from 'node:os';
import { join, sep } from 'node:path';
import {
  benchmarkConfigurationDefaults,
  normalizeBenchmarkConfiguration,
} from './bench-defaults.mjs';

export const PROVENANCE_FIELDS = [
  'createdAt',
  'command',
  'gitRevision',
  'benchmarkHarnessHash',
  'benchmarkConfigHash',
  'sourceTreeHash',
  'lockfileHash',
  'corpusHash',
  'dirty',
  'dirtyPaths',
  'node',
  'v8',
  'platform',
  'arch',
  'osRelease',
  'cpu',
  'cpuCount',
  'governor',
  'pinnedCore',
];

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function gitOutput(args, root) {
  try {
    return execFileSync('git', args, { cwd: root });
  } catch (error) {
    // Some restricted runners report EPERM after the child has produced the
    // requested output. Preserve that output when it is complete.
    if (error.stdout?.length) return error.stdout;
    throw error;
  }
}

function repositoryFiles(root) {
  const output = gitOutput(
    ['ls-files', '-co', '--exclude-standard', '-z'],
    root
  );
  return output
    .toString()
    .split('\0')
    .filter(Boolean)
    .map((file) => file.split(sep).join('/'));
}

function filesBelow(root, directory) {
  const result = [];
  const visit = (path, relativePath) => {
    if (!existsSync(path)) return;
    for (const entry of readdirSync(path, { withFileTypes: true }).toSorted(
      (a, b) => a.name.localeCompare(b.name)
    )) {
      const entryPath = join(path, entry.name);
      const entryRelativePath = `${relativePath}/${entry.name}`;
      if (entry.isDirectory()) visit(entryPath, entryRelativePath);
      else if (entry.isFile()) result.push(entryRelativePath);
    }
  };
  visit(join(root, directory), directory);
  return result;
}

function hashFiles(root, paths) {
  const hash = createHash('sha256');
  for (const file of [...new Set(paths)].toSorted()) {
    const path = join(root, file);
    if (!existsSync(path) || !lstatSync(path).isFile()) continue;
    const contents = readFileSync(path);
    hash.update(file);
    hash.update('\0');
    hash.update(sha256(contents));
    hash.update('\n');
  }
  return hash.digest('hex');
}

function hashSourceFiles(root, paths) {
  const hash = createHash('sha256');
  for (const file of [...new Set(paths)].toSorted()) {
    const path = join(root, file);
    if (!existsSync(path) || !lstatSync(path).isFile()) continue;
    let contents = readFileSync(path);
    if (file.endsWith('package.json')) {
      const manifest = JSON.parse(contents);
      delete manifest.scripts;
      contents = JSON.stringify(manifest);
    }
    hash.update(file);
    hash.update('\0');
    hash.update(sha256(contents));
    hash.update('\n');
  }
  return hash.digest('hex');
}

function isHarnessFile(file) {
  return /^util\/benchmark\/[^\/]+\.(?:c?m?js|sh)$/v.test(file);
}

function sourceFiles(files) {
  return files.filter(
    (file) =>
      (/^packages\/[^\/]+\/src\//v.test(file) && !file.startsWith('util/')) ||
      file === 'package.json' ||
      /^packages\/[^\/]+\/package\.json$/v.test(file) ||
      /(?:^|\/)(?:tsconfig|\.browserslistrc|browserslist)(?:\.|$)/v.test(
        file
      ) ||
      /(?:^|\/)[^\/]+\.config\.[cm]?[jt]s$/v.test(file)
  );
}

function dirtyPaths(root) {
  return gitOutput(['status', '--porcelain=v1', '-z'], root)
    .toString()
    .split('\0')
    .filter(Boolean)
    .map((entry) => entry.slice(3).trim().replace(/^"|"$/gv, ''))
    .map((file) => file.split(sep).join('/'))
    .toSorted();
}

const GOVERNOR_PATH = '/sys/devices/system/cpu/cpu0/cpufreq/scaling_governor';
const UNSTABLE_GOVERNORS = new Set(['powersave', 'ondemand']);

export function readCpuGovernor() {
  try {
    return readFileSync(GOVERNOR_PATH, 'utf8').trim() || null;
  } catch {
    // scaling governor file not available on this platform
    return null;
  }
}

// Environment setup is a coordinator concern: report it once instead of in
// every child process.
export function warnUnstableGovernor(
  mode,
  governor = readCpuGovernor(),
  { log = console.warn } = {}
) {
  if (mode === 'stable' && UNSTABLE_GOVERNORS.has(governor)) {
    log(
      `Warning: CPU scaling governor is "${governor}". Frequency scaling induces timing jitter; use --pin-core (or the "performance" governor) for stable measurements.`
    );
  }
  return UNSTABLE_GOVERNORS.has(governor) && mode === 'stable';
}

export function currentGitRevision(root = process.cwd()) {
  return gitOutput(['rev-parse', 'HEAD'], root).toString().trim();
}

export function assertRevision(revision, root = process.cwd()) {
  const actual = currentGitRevision(root);
  if (revision !== actual) {
    throw new Error(
      `--revision does not match checkout HEAD (${revision} != ${actual})`
    );
  }
  return actual;
}

export function repositoryHashes(
  root = process.cwd(),
  benchmarkConfiguration = benchmarkConfigurationDefaults()
) {
  const files = repositoryFiles(root);
  // Hash only the harness files that are injected into benchmark worktrees.
  // Workflow files and branch-specific package scripts must not affect the
  // harness identity or valid comparisons fail after unrelated edits.
  const harnessFiles = filesBelow(root, 'util/benchmark').filter(isHarnessFile);
  const benchmarkHarnessHash = hashFiles(root, harnessFiles);
  const lockfileHash = hashFiles(root, ['pnpm-lock.yaml']);
  // The normalized benchmark configuration is a distinct domain: comparisons
  // taken under different workloads or statistical settings are not
  // comparable even when the harness code hash matches.
  const benchmarkConfigHash = sha256(
    JSON.stringify(normalizeBenchmarkConfiguration(benchmarkConfiguration))
  );
  return {
    benchmarkHarnessHash,
    benchmarkConfigHash,
    sourceTreeHash: hashSourceFiles(root, sourceFiles(files)),
    lockfileHash,
  };
}

export function createProvenance({
  command = process.argv.slice(0),
  corpusHash,
  gitRevision,
  root = process.cwd(),
  createdAt = new Date().toISOString(),
  benchmarkConfiguration,
  pinnedCore = null,
} = {}) {
  if (typeof corpusHash !== 'string' || !/^[\da-f]{64}$/v.test(corpusHash)) {
    throw new TypeError('corpusHash must be a SHA-256 hash');
  }
  const revision = gitRevision ?? currentGitRevision(root);
  assertRevision(revision, root);
  const hashes = repositoryHashes(root, benchmarkConfiguration);
  const cpu = cpus()[0];
  const paths = dirtyPaths(root);
  return {
    createdAt,
    command: Array.isArray(command) ? [...command] : String(command),
    gitRevision: revision,
    ...hashes,
    corpusHash,
    dirty: paths.length > 0,
    dirtyPaths: paths,
    node: process.version,
    v8: process.versions.v8,
    platform: platform(),
    arch: process.arch,
    osRelease: release(),
    cpu: cpu?.model ?? null,
    cpuCount: cpus().length,
    governor: readCpuGovernor(),
    pinnedCore: pinnedCore ?? null,
  };
}

// eslint-disable-next-line complexity
export function validateProvenance(provenance, { root, corpusHash } = {}) {
  if (!provenance || typeof provenance !== 'object') {
    throw new TypeError('benchmark provenance is required');
  }
  for (const field of PROVENANCE_FIELDS) {
    if (!(field in provenance)) {
      throw new TypeError(`benchmark provenance.${field} is required`);
    }
  }
  if (
    typeof provenance.createdAt !== 'string' ||
    !Number.isFinite(Date.parse(provenance.createdAt))
  ) {
    throw new TypeError('benchmark provenance.createdAt must be an ISO date');
  }
  if (
    !Array.isArray(provenance.command) ||
    provenance.command.some((value) => typeof value !== 'string')
  ) {
    throw new TypeError(
      'benchmark provenance.command must be an array of strings'
    );
  }
  if (!/^[\da-f]{40}$/v.test(provenance.gitRevision)) {
    throw new TypeError('benchmark provenance.gitRevision must be a full SHA');
  }
  for (const field of [
    'benchmarkHarnessHash',
    'benchmarkConfigHash',
    'sourceTreeHash',
    'lockfileHash',
    'corpusHash',
  ]) {
    if (!/^[\da-f]{64}$/v.test(provenance[field])) {
      throw new TypeError(
        `benchmark provenance.${field} must be a SHA-256 hash`
      );
    }
  }
  if (root) assertRevision(provenance.gitRevision, root);
  if (corpusHash !== undefined && provenance.corpusHash !== corpusHash) {
    throw new Error('benchmark provenance.corpusHash differs from corpus');
  }
  if (typeof provenance.dirty !== 'boolean') {
    throw new TypeError('benchmark provenance.dirty must be boolean');
  }
  if (
    !Array.isArray(provenance.dirtyPaths) ||
    provenance.dirtyPaths.some((path) => typeof path !== 'string') ||
    new Set(provenance.dirtyPaths).size !== provenance.dirtyPaths.length ||
    provenance.dirtyPaths.some(
      (path, index, paths) => index > 0 && paths[index - 1] > path
    )
  ) {
    throw new TypeError('benchmark provenance.dirtyPaths must be an array');
  }
  if (provenance.dirty !== provenance.dirtyPaths.length > 0) {
    throw new Error('benchmark provenance.dirty disagrees with dirtyPaths');
  }
  for (const field of ['node', 'v8', 'platform', 'arch', 'osRelease']) {
    if (typeof provenance[field] !== 'string' || !provenance[field]) {
      throw new TypeError(`benchmark provenance.${field} must be a string`);
    }
  }
  if (provenance.cpu !== null && typeof provenance.cpu !== 'string') {
    throw new TypeError('benchmark provenance.cpu must be a string or null');
  }
  if (!Number.isInteger(provenance.cpuCount) || provenance.cpuCount < 1) {
    throw new TypeError(
      'benchmark provenance.cpuCount must be a positive integer'
    );
  }
  if (provenance.governor !== null && typeof provenance.governor !== 'string') {
    throw new TypeError(
      'benchmark provenance.governor must be a string or null'
    );
  }
  if (
    provenance.pinnedCore !== null &&
    (!Number.isInteger(provenance.pinnedCore) || provenance.pinnedCore < 0)
  ) {
    throw new TypeError(
      'benchmark provenance.pinnedCore must be a non-negative integer or null'
    );
  }
  return provenance;
}
