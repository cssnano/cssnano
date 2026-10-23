// Writes or checks the output of every built-in preset over the framework
// corpus, so a refactor can prove its output is byte-identical to a baseline.
//
//   node util/presetSnapshot.js --write [dir]   record the outputs
//   node util/presetSnapshot.js --check [dir]   compare against the outputs
//
// `dir` defaults to .cache/preset-snapshot. A check exits 1 when any output
// differs, is missing or is extra, and lists the first differences.
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { createRequire } from 'node:module';
import { repositoryFile } from './testHelpers.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cssnanoDir = join(root, 'packages', 'cssnano');
const frameworksDir = join(root, 'frameworks');
const defaultDir = join(root, '.cache', 'preset-snapshot');

const require = createRequire(join(cssnanoDir, 'package.json'));
const postcss = (await import(pathToFileURL(require.resolve('postcss')).href))
  .default;

/**
 * Each configuration is a preset and the options it runs with. The browser
 * targets are included so target-dependent stages take both branches.
 *
 * @type {Record<string, { preset: string, options: Record<string, unknown> }>}
 */
const configurations = {
  default: { preset: 'default', options: {} },
  'default-modern': {
    preset: 'default',
    options: { browserslist: { env: 'modern' } },
  },
  'default-ie11': {
    preset: 'default',
    options: { browserslist: { query: 'ie 11' } },
  },
  lite: { preset: 'lite', options: {} },
  advanced: { preset: 'advanced', options: {} },
  'advanced-modern': {
    preset: 'advanced',
    options: { browserslist: { env: 'modern' } },
  },
};

/**
 * @param {string} name a configuration name
 * @return {Promise<(options?: object) => import('postcss').AcceptedPlugin[]>}
 */
async function loadPreset(name) {
  const file = join(cssnanoDir, 'src', 'presets', `${name}.js`);
  return (await import(pathToFileURL(file).href)).default;
}

/**
 * Runs one configuration over every framework file.
 *
 * @param {string} name
 * @return {Promise<Map<string, { css?: string, error?: string }>>} keyed by
 *   the framework file name, which is the output file's name without `.css`
 */
async function runConfiguration(name) {
  const { preset: presetName, options } = configurations[name];
  const preset = await loadPreset(presetName);
  /** @type {Map<string, { css?: string, error?: string }>} */
  const outputs = new Map();
  for (const file of readdirSync(frameworksDir).toSorted()) {
    const css = readFileSync(join(frameworksDir, file), 'utf8');
    try {
      const result = await postcss(preset(options)).process(css, {
        from: repositoryFile,
      });
      outputs.set(file, { css: result.css });
    } catch (error) {
      outputs.set(file, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return outputs;
}

/**
 * Lists the output files of a snapshot as `configuration/framework.css`,
 * so the check can tell a missing case from a different one.
 *
 * @param {string} dir
 * @return {string[]}
 */
function listSnapshot(dir) {
  if (!existsSync(dir)) return [];
  const names = [];
  for (const configuration of readdirSync(dir).toSorted()) {
    for (const file of readdirSync(join(dir, configuration)).toSorted()) {
      names.push(`${configuration}/${file}`);
    }
  }
  return names;
}

/**
 * Writes the snapshot, replacing any earlier one. Errors are recorded as
 * `.error` files, so a throwing case is part of the baseline.
 *
 * @param {string} dir
 */
async function write(dir) {
  rmSync(dir, { recursive: true, force: true });
  let count = 0;
  for (const name of Object.keys(configurations)) {
    const outputDir = join(dir, name);
    mkdirSync(outputDir, { recursive: true });
    for (const [file, output] of await runConfiguration(name)) {
      const base = file.slice(0, -'.css'.length);
      if ('error' in output) {
        writeFileSync(join(outputDir, `${base}.error`), output.error);
      } else {
        writeFileSync(join(outputDir, `${base}.css`), output.css);
      }
      count++;
    }
  }
  console.log(`wrote ${count} outputs to ${dir}`);
}

/**
 * Compares the current outputs with the snapshot in `dir`.
 *
 * @param {string} dir
 * @return {Promise<number>} the process exit code
 */
async function check(dir) {
  if (!existsSync(dir)) {
    console.error(`no snapshot at ${dir}; run with --write first`);
    return 2;
  }
  const expected = new Set(listSnapshot(dir));
  /** @type {string[]} */
  const differences = [];
  let identical = 0;
  for (const name of Object.keys(configurations)) {
    for (const [file, output] of await runConfiguration(name)) {
      const base = file.slice(0, -'.css'.length);
      const key = `${name}/${'error' in output ? `${base}.error` : file}`;
      const recorded = join(dir, key);
      if (!expected.has(key)) {
        differences.push(`extra ${key}`);
        continue;
      }
      expected.delete(key);
      const text = 'error' in output ? output.error : output.css;
      if (readFileSync(recorded, 'utf8') === text) {
        identical++;
      } else {
        differences.push(`differs ${key}`);
      }
    }
  }
  for (const key of expected) differences.push(`missing ${key}`);

  console.log(`${identical} identical, ${differences.length} different`);
  for (const line of differences.slice(0, 20)) console.log(`  ${line}`);
  return differences.length === 0 ? 0 : 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { values, positionals } = parseArgs({
    options: {
      write: { type: 'boolean' },
      check: { type: 'boolean' },
    },
    allowPositionals: true,
    strict: true,
  });
  if (values.write === values.check) {
    console.error(
      'usage: node util/presetSnapshot.js (--write | --check) [dir]'
    );
    process.exitCode = 2;
  } else {
    const dir = positionals[0] ? resolve(positionals[0]) : defaultDir;
    if (values.write) {
      await write(dir);
    } else {
      process.exitCode = await check(dir);
    }
  }
}
