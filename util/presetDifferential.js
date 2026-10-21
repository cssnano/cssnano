import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { withRevisionPackage } from './fuzzAgainstRevision.js';
import { repositoryFile } from './testHelpers.js';

/**
 * @typedef {{ name: string, css: string } | { name: string, error: string }} CaseOutput
 * @typedef {'grew' | 'shrank' | 'same-length' | 'errored'} DifferenceKind
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const frameworksDir = join(root, 'frameworks');
const mergeScripts = join(
  root,
  'packages',
  'cssnano',
  'script',
  'passes',
  'merge'
);
const candidateSrc = join(root, 'packages', 'cssnano', 'src');
const usage =
  'usage: node util/presetDifferential.js [--base <rev>] [--seed <n>] [--count <n>] [--show <n>]';

/**
 * @param {string} file A generator module, relative to the merge pass scripts
 * @return {Promise<Record<string, Function>>}
 */
function loadGenerator(file) {
  return import(pathToFileURL(join(mergeScripts, file)).href);
}

/**
 * Corpus names are `<source>#<index>`, so the source is the part before `#`.
 *
 * @param {string} name
 * @return {string}
 */
function sourceOf(name) {
  return name.slice(0, name.indexOf('#'));
}

/**
 * @param {CaseOutput} entry
 * @return {string}
 */
function describeOutput(entry) {
  return 'error' in entry ? `throws: ${entry.error}` : entry.css;
}

/**
 * Compares the output of a base and a candidate run over one corpus.
 *
 * A case missing from either side is an error, so a dropped case cannot hide
 * a difference. A case that throws the same message on both sides is not a
 * difference; a case that throws on one side only is.
 *
 * @param {CaseOutput[]} base
 * @param {CaseOutput[]} candidate
 * @return {{ counts: Record<'identical' | DifferenceKind, number>, differences: { name: string, kind: DifferenceKind, base: CaseOutput, candidate: CaseOutput }[] }}
 */
export function compareOutputs(base, candidate) {
  const candidateByName = new Map(
    candidate.map((entry) => [entry.name, entry])
  );
  const baseNames = new Set(base.map((entry) => entry.name));
  const missing = base
    .filter((entry) => !candidateByName.has(entry.name))
    .map((entry) => entry.name);
  const extra = candidate
    .filter((entry) => !baseNames.has(entry.name))
    .map((entry) => entry.name);
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `case sets differ: missing ${missing.join(', ') || 'none'}, extra ${extra.join(', ') || 'none'}`
    );
  }

  /** @type {Record<'identical' | DifferenceKind, number>} */
  const counts = {
    identical: 0,
    grew: 0,
    shrank: 0,
    'same-length': 0,
    errored: 0,
  };
  const differences = [];
  for (const left of base) {
    const right = candidateByName.get(left.name);
    const kind = classify(left, right);
    if (kind === undefined) {
      counts.identical++;
    } else {
      counts[kind]++;
      differences.push({ name: left.name, kind, base: left, candidate: right });
    }
  }
  return { counts, differences };
}

/**
 * @param {CaseOutput} base
 * @param {CaseOutput} candidate
 * @return {DifferenceKind | undefined} `undefined` when the outputs agree
 */
function classify(base, candidate) {
  if ('error' in base || 'error' in candidate) {
    const sameError =
      'error' in base && 'error' in candidate && base.error === candidate.error;
    return sameError ? undefined : 'errored';
  }
  if (base.css === candidate.css) {
    return undefined;
  }
  const delta = Buffer.byteLength(candidate.css) - Buffer.byteLength(base.css);
  if (delta > 0) return 'grew';
  if (delta < 0) return 'shrank';
  return 'same-length';
}

/**
 * The corpus is generated once, here in the parent, so both runs see the same
 * inputs. Each name starts with its source, so a difference traces back to the
 * generator that made it.
 *
 * The generators are loaded here only: the children never import them.
 *
 * @param {number} seed
 * @param {number} count Cases per generator; the framework fixtures are all used
 * @return {Promise<{ name: string, css: string }[]>}
 */
async function buildCorpus(seed, count) {
  const [rules, crossBlock, cascade, sizes] = await Promise.all([
    loadGenerator('rules/lib/fuzzGenerate.js'),
    loadGenerator('rules/lib/fuzzCrossBlock.js'),
    loadGenerator('rules/lib/fuzzCascade.js'),
    loadGenerator('longhand/lib/fuzzSizeGenerate.js'),
  ]);

  const frameworks = readdirSync(frameworksDir)
    .toSorted()
    .map((file) => ({
      name: `frameworks#${file}`,
      css: readFileSync(join(frameworksDir, file), 'utf8'),
    }));
  // The same stylesheet shape the merge-rules fuzzer checks each selector in.
  const selectors = rules
    .generateCases(seed, count)
    .map(({ selector }, index) => ({
      name: `generateCases#${index}`,
      css: `${selector}{color:red}b{color:red}`,
    }));
  const blocks = crossBlock
    .generateCrossBlockCases(seed, count)
    .map((css, index) => ({ name: `generateCrossBlockCases#${index}`, css }));
  const cascades = cascade
    .generateCascadeCases(seed, count)
    .map(({ css }, index) => ({ name: `generateCascadeCases#${index}`, css }));
  const borders = sizes
    .generateBorderSizeCases(seed, count)
    .map((css, index) => ({ name: `generateBorderSizeCases#${index}`, css }));

  return [...frameworks, ...selectors, ...blocks, ...cascades, ...borders];
}

/**
 * Runs preset-default over the corpus with the preset under `src`, in a fresh
 * process so the base and candidate never share modules.
 *
 * @param {string} src A `src` directory holding `presets/default.js`
 * @param {string} inputFile JSON array of `{ name, css }`
 * @param {string} outputFile Receives a JSON array of `CaseOutput`
 * @return {CaseOutput[]}
 */
function runCorpus(src, inputFile, outputFile) {
  const run = spawnSync(
    process.execPath,
    [fileURLToPath(import.meta.url), '--run', src, inputFile, outputFile],
    { encoding: 'utf8', stdio: ['ignore', 'ignore', 'pipe'] }
  );
  if (run.status !== 0) {
    throw new Error(`running ${src} failed:\n${run.stderr}`);
  }
  return JSON.parse(readFileSync(outputFile, 'utf8'));
}

/**
 * Child mode: runs each case and records either its output or the error it
 * threw, so one throwing case does not end the run.
 *
 * @param {string} src
 * @param {string} inputFile
 * @param {string} outputFile
 */
async function runChild(src, inputFile, outputFile) {
  const require = createRequire(join(src, 'package.json'));
  const postcss = (await import(pathToFileURL(require.resolve('postcss')).href))
    .default;
  const { default: presetDefault } = await import(
    pathToFileURL(join(src, 'presets', 'default.js')).href
  );
  const cases = JSON.parse(readFileSync(inputFile, 'utf8'));
  /** @type {CaseOutput[]} */
  const outputs = [];
  for (const { name, css } of cases) {
    try {
      const result = await postcss(presetDefault()).process(css, {
        // The corpus follows the repository's browserslist config, as the
        // integration tests do.
        from: repositoryFile,
      });
      outputs.push({ name, css: result.css });
    } catch (error) {
      outputs.push({
        name,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  writeFileSync(outputFile, JSON.stringify(outputs));
}

/**
 * Prints the per-source difference counts, then the first `show` differences
 * with their input and both outputs, and returns the process exit code.
 *
 * @param {ReturnType<typeof compareOutputs>} comparison
 * @param {{ name: string, css: string }[]} corpus
 * @param {number} show
 * @param {string} rev
 * @return {number}
 */
function report({ counts, differences }, corpus, show, rev) {
  /** @type {Map<string, { cases: number, differences: number }>} */
  const sources = new Map();
  for (const { name } of corpus) {
    const source = sourceOf(name);
    const entry = sources.get(source) ?? { cases: 0, differences: 0 };
    entry.cases++;
    sources.set(source, entry);
  }
  for (const { name } of differences) {
    sources.get(sourceOf(name)).differences++;
  }

  console.log(
    `${corpus.length} cases against ${rev}: ${JSON.stringify(counts)}`
  );
  for (const [source, { cases, differences: count }] of sources) {
    console.log(
      `  ${source.padEnd(28)} ${String(cases).padStart(6)} cases  ${String(count).padStart(6)} differ`
    );
  }

  if (differences.length === 0) {
    return 0;
  }
  const inputs = new Map(corpus.map(({ name, css }) => [name, css]));
  for (const { name, kind, base, candidate } of differences.slice(0, show)) {
    console.log(`\n${name} (${kind})\ninput:\n${inputs.get(name)}`);
    console.log(`${rev}:\n${describeOutput(base)}`);
    console.log(`working tree:\n${describeOutput(candidate)}`);
  }
  return 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === '--run') {
    const [src, inputFile, outputFile] = process.argv.slice(3);
    await runChild(src, inputFile, outputFile);
  } else {
    let values;
    try {
      ({ values } = parseArgs({
        options: {
          base: { type: 'string', default: 'main' },
          seed: { type: 'string', default: '1' },
          count: { type: 'string', default: '1000' },
          show: { type: 'string', default: '5' },
        },
        strict: true,
      }));
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      console.error(usage);
      process.exit(2);
    }
    const seed = Number(values.seed);
    const count = Number(values.count);
    const show = Number(values.show);
    if (![seed, count, show].every(Number.isSafeInteger) || count < 1) {
      console.error(`--seed, --count and --show must be integers\n${usage}`);
      process.exit(2);
    }

    const exchange = mkdtempSync(join(tmpdir(), 'preset-differential-'));
    try {
      const corpus = await buildCorpus(seed, count);
      const inputFile = join(exchange, 'input.json');
      writeFileSync(inputFile, JSON.stringify(corpus));
      const base = withRevisionPackage(values.base, (src) =>
        runCorpus(src, inputFile, join(exchange, 'base.json'))
      );
      const candidate = runCorpus(
        candidateSrc,
        inputFile,
        join(exchange, 'candidate.json')
      );
      const comparison = compareOutputs(base, candidate);
      process.exitCode = report(comparison, corpus, show, values.base);
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 2;
    } finally {
      rmSync(exchange, { recursive: true, force: true });
    }
  }
}
