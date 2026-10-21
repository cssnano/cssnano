import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { createRequire } from 'node:module';
import { withRevisionPackage } from './fuzzAgainstRevision.js';
import { repositoryFile } from './testHelpers.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const frameworksDir = join(root, 'frameworks');
const candidateSrc = join(root, 'packages', 'cssnano', 'src');
const usage = 'usage: node util/corpusSize.js [--base <rev>]';

/**
 * Compares the per-fixture sizes of a base and a candidate run.
 *
 * A fixture that is missing from either side is an error, so a renamed or
 * dropped fixture cannot hide a growth.
 *
 * @param {Record<string, number>} base Bytes per fixture on the base revision
 * @param {Record<string, number>} candidate Bytes per fixture on the candidate
 * @return {{ rows: { name: string, base: number, candidate: number, delta: number }[], grew: string[], total: { base: number, candidate: number, delta: number } }}
 */
export function compareSizes(base, candidate) {
  const names = Object.keys(base);
  const missing = names.filter((name) => !(name in candidate));
  const extra = Object.keys(candidate).filter((name) => !(name in base));
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `fixture sets differ: missing ${missing.join(', ') || 'none'}, extra ${extra.join(', ') || 'none'}`
    );
  }
  const rows = names.map((name) => ({
    name,
    base: base[name],
    candidate: candidate[name],
    delta: candidate[name] - base[name],
  }));
  const total = { base: 0, candidate: 0, delta: 0 };
  const grew = [];
  for (const row of rows) {
    total.base += row.base;
    total.candidate += row.candidate;
    total.delta += row.delta;
    if (row.delta > 0) grew.push(row.name);
  }
  return { rows, grew, total };
}

/**
 * Runs preset-default over every framework file with the preset under `src`.
 * It runs in its own process, so the base and candidate never share modules.
 *
 * @param {string} src A `src` directory holding `presets/default.js`
 * @return {Promise<Record<string, number>>} Output bytes per fixture name
 */
async function measure(src) {
  const require = createRequire(join(src, 'package.json'));
  const postcss = (await import(pathToFileURL(require.resolve('postcss')).href))
    .default;
  const { default: presetDefault } = await import(
    pathToFileURL(join(src, 'presets', 'default.js')).href
  );
  /** @type {Record<string, number>} */
  const sizes = {};
  for (const file of readdirSync(frameworksDir)) {
    const css = readFileSync(join(frameworksDir, file), 'utf8');
    const result = await postcss(presetDefault()).process(css, {
      // The fixtures follow the repository's browserslist config, as the
      // integration tests do.
      from: repositoryFile,
    });
    sizes[basename(file, '.css')] = Buffer.byteLength(result.css);
  }
  return sizes;
}

/**
 * @param {string} src
 * @return {Record<string, number>}
 */
function measureInProcess(src) {
  const run = spawnSync(
    process.execPath,
    [fileURLToPath(import.meta.url), '--measure', src],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
  );
  if (run.status !== 0) {
    throw new Error(`measuring ${src} failed:\n${run.stderr}`);
  }
  return JSON.parse(run.stdout);
}

/**
 * Measures the `src` of a git revision.
 *
 * @param {string} rev
 * @return {Record<string, number>}
 */
function measureRevision(rev) {
  return withRevisionPackage(rev, measureInProcess);
}

/**
 * Prints the per-fixture table and returns the process exit code: non-zero
 * when any fixture grew.
 *
 * @param {ReturnType<typeof compareSizes>} comparison
 * @param {string} rev
 * @return {number}
 */
function report({ rows, grew, total }, rev) {
  const width = Math.max(...rows.map((row) => row.name.length), 7);
  console.log(
    `${'fixture'.padEnd(width)}  ${rev.padStart(10)}  ${'working'.padStart(10)}  delta`
  );
  for (const row of rows) {
    const sign = row.delta > 0 ? '+' : '';
    console.log(
      `${row.name.padEnd(width)}  ${String(row.base).padStart(10)}  ${String(row.candidate).padStart(10)}  ${sign}${row.delta}`
    );
  }
  console.log(
    `${'TOTAL'.padEnd(width)}  ${String(total.base).padStart(10)}  ${String(total.candidate).padStart(10)}  ${total.delta > 0 ? '+' : ''}${total.delta}`
  );
  if (grew.length > 0) {
    console.error(`\n${grew.length} fixture(s) grew: ${grew.join(', ')}`);
    return 1;
  }
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === '--measure') {
    const sizes = await measure(process.argv[3]);
    process.stdout.write(JSON.stringify(sizes));
  } else {
    let values;
    try {
      ({ values } = parseArgs({
        options: { base: { type: 'string', default: 'main' } },
        strict: true,
      }));
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      console.error(usage);
      process.exit(2);
    }
    try {
      const base = measureRevision(values.base);
      const candidate = measureInProcess(candidateSrc);
      process.exitCode = report(compareSizes(base, candidate), values.base);
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      process.exit(2);
    }
  }
}
