import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { cpus, platform, release } from 'node:os';
import { join, sep } from 'node:path';

export const PROVENANCE_FIELDS = [
  'createdAt',
  'command',
  'gitRevision',
  'benchmarkHarnessHash',
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
  return /^util\/benchmark\/[^/]+\.(?:c?m?js|sh)$/u.test(file);
}

function sourceFiles(files) {
  return files.filter(
    (file) =>
      (/^packages\/[^/]+\/src\//u.test(file) && !file.startsWith('util/')) ||
      file === 'package.json' ||
      /^packages\/[^/]+\/package\.json$/u.test(file) ||
      /(?:^|\/)(?:tsconfig|\.browserslistrc|browserslist)(?:\.|$)/u.test(
        file
      ) ||
      /(?:^|\/)[^/]+\.config\.[cm]?[jt]s$/u.test(file)
  );
}

function benchmarkScripts(packageJson) {
  return Object.fromEntries(
    Object.entries(packageJson.scripts ?? {})
      .filter(([name]) => /^(?:bench(?:$|:)|test:benchmark(?:$|:))/u.test(name))
      .toSorted(([a], [b]) => a.localeCompare(b))
  );
}

function dirtyPaths(root) {
  return gitOutput(['status', '--porcelain=v1', '-z'], root)
    .toString()
    .split('\0')
    .filter(Boolean)
    .map((entry) => entry.slice(3).trim().replace(/^"|"$/gu, ''))
    .map((file) => file.split(sep).join('/'))
    .toSorted();
}

function cpuGovernor(mode) {
  const path = '/sys/devices/system/cpu/cpu0/cpufreq/scaling_governor';
  let governor = null;
  try {
    governor = readFileSync(path, 'utf8').trim() || null;
  } catch {
    // scaling governor file not available on this platform
  }
  if (
    mode === 'stable' &&
    (governor === 'powersave' || governor === 'ondemand')
  ) {
    console.warn(
      `Warning: CPU scaling governor is "${governor}". Frequency scaling induces timing jitter; performance benchmarks should use "performance" governor.`
    );
  }
  return governor;
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

export function repositoryHashes(root = process.cwd()) {
  const files = repositoryFiles(root);
  const harnessFiles = filesBelow(root, 'util/benchmark').filter(isHarnessFile);
  harnessFiles.push('.github/workflows/performance.yml');
  const packageJson = JSON.parse(readFileSync(join(root, 'package.json')));
  const scripts = JSON.stringify(benchmarkScripts(packageJson));
  const benchmarkHarnessHash = hashFiles(root, harnessFiles) + '\0' + scripts;
  const lockfileHash = hashFiles(root, ['pnpm-lock.yaml']);
  return {
    benchmarkHarnessHash: sha256(benchmarkHarnessHash),
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
  mode = null,
  pinnedCore = null,
} = {}) {
  if (typeof corpusHash !== 'string' || !/^[\da-f]{64}$/u.test(corpusHash)) {
    throw new TypeError('corpusHash must be a SHA-256 hash');
  }
  const revision = gitRevision ?? currentGitRevision(root);
  assertRevision(revision, root);
  const hashes = repositoryHashes(root);
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
    governor: cpuGovernor(mode),
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
  if (!/^[\da-f]{40}$/u.test(provenance.gitRevision)) {
    throw new TypeError('benchmark provenance.gitRevision must be a full SHA');
  }
  for (const field of [
    'benchmarkHarnessHash',
    'sourceTreeHash',
    'lockfileHash',
    'corpusHash',
  ]) {
    if (!/^[\da-f]{64}$/u.test(provenance[field])) {
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
