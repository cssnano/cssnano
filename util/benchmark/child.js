// Measures one fresh process, the unit the parent pairs across two revisions.
// The first pass gives the cold start, which includes module loading and the
// first run through cold caches. Warm passes then run before the timed ones.
// The process prints one JSON line on stdout and nothing else.

import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { parseArgs } from 'node:util';
import { Session } from 'node:inspector/promises';
import { loadCaseModule } from './cases/modules.js';
import { median } from './stats.js';

// Set before cssnano loads, so the measured code takes its production paths.
process.env.NODE_ENV ??= 'production';

const require = createRequire(import.meta.url);
const PRESET_NAMES = new Set(['default', 'advanced', 'lite']);

const WARMUP_MIN_PASSES = 3;
const WARMUP_MIN_MS = 500;
const TIMED_SAMPLES = 10;
const SAMPLE_MIN_MS = 50;

function createProcessor(benchmarkCase, presetName) {
  if (benchmarkCase?.createProcessor) return benchmarkCase.createProcessor();
  if (!PRESET_NAMES.has(presetName)) {
    throw new Error(`unknown preset "${presetName}"`);
  }
  // Loaded here, as cssnano loads the default preset, so the child loads
  // neither for a case with its own processor; that case's file decides.
  const cssnano = require('../../packages/cssnano/src/index.js');
  const preset = require(`../../packages/cssnano/src/presets/${presetName}.js`);
  return cssnano({ preset });
}

// The cases reach into the internals of the current source tree, which an
// older base revision may lack, so a --case run loads only the module that
// defines its case.
async function loadCase(caseName, file) {
  const cases = await loadCaseModule(file);
  if (!Object.hasOwn(cases, caseName)) {
    throw new Error(`unknown benchmark case "${caseName}"`);
  }
  return cases[caseName];
}

function selectCorpus(caseName, benchmarkCase, directory) {
  if (benchmarkCase) return [{ name: caseName, source: benchmarkCase.css }];
  const corpus = readdirSync(directory)
    .filter((file) => file.endsWith('.css'))
    .map((file) => ({
      name: basename(file, '.css'),
      source: readFileSync(join(directory, file), 'utf8'),
    }))
    .toSorted((a, b) => a.name.localeCompare(b.name));
  if (!corpus.length) throw new Error('selected corpus contains no CSS files');
  return corpus;
}

function hashOutput(css) {
  return createHash('sha256').update(css).digest('hex');
}

async function processCorpus(corpus, processor, measure, now) {
  const samples = {};
  const outputs = {};
  const processed = [];
  const started = now();
  for (const { name, source } of corpus) {
    const fileStarted = now();
    const { css } = await processor.process(source, { from: undefined });
    if (measure) {
      samples[name] = now() - fileStarted;
      processed.push({ name, css });
    }
  }
  const elapsed = now() - started;
  for (const { name, css } of processed) outputs[name] = hashOutput(css);
  return { elapsed, samples, outputs };
}

// One timed sample: the mean time per pass over a batch of passes, each of
// which must reproduce the output of the cold pass.
async function measureSample(corpus, processor, passes, outputHashes, now) {
  let elapsed = 0;
  const samples = Object.fromEntries(corpus.map(({ name }) => [name, 0]));
  for (let pass = 0; pass < passes; pass++) {
    const timed = await processCorpus(corpus, processor, true, now);
    elapsed += timed.elapsed;
    for (const { name } of corpus) {
      samples[name] += timed.samples[name];
      if (timed.outputs[name] !== outputHashes[name]) {
        throw new Error(`output changed during benchmark for ${name}`);
      }
    }
  }
  for (const { name } of corpus) samples[name] /= passes;
  return { elapsed: elapsed / passes, samples };
}

/**
 * @param {{ name: string, source: string }[]} corpus
 * @param {object} processor a PostCSS processor
 * @param {{ profilePath?: string, now?: () => number }} [options]
 */
export async function measureProcess(
  corpus,
  processor,
  { profilePath, now = () => performance.now() } = {}
) {
  const first = await processCorpus(corpus, processor, true, now);
  const coldStartMs = now();
  const outputHashes = first.outputs;

  // Warm-up ends only when both minimums are met, so a slow pass cannot cut
  // it short and a fast one cannot end it before the clock has run long enough.
  const warmStarted = now();
  let warmPasses = 0;
  while (
    warmPasses < WARMUP_MIN_PASSES ||
    now() - warmStarted < WARMUP_MIN_MS
  ) {
    await processCorpus(corpus, processor, false, now);
    warmPasses++;
  }
  // A sample of a few milliseconds is dominated by timer and scheduler
  // jitter, so short passes are batched until a sample lasts SAMPLE_MIN_MS.
  // The batch size is fixed from the warm-up mean so every sample is alike.
  const passMs = (now() - warmStarted) / warmPasses;
  const passesPerSample = Math.max(1, Math.ceil(SAMPLE_MIN_MS / passMs));

  let session = null;
  const totals = [];
  const perFile = Object.fromEntries(corpus.map(({ name }) => [name, []]));
  try {
    if (profilePath) {
      session = new Session();
      session.connect();
      await session.post('Profiler.enable');
      await session.post('Profiler.start');
    }
    for (let sample = 0; sample < TIMED_SAMPLES; sample++) {
      const timed = await measureSample(
        corpus,
        processor,
        passesPerSample,
        outputHashes,
        now
      );
      totals.push(timed.elapsed);
      for (const { name } of corpus) perFile[name].push(timed.samples[name]);
    }
    if (session) {
      const { profile } = await session.post('Profiler.stop');
      mkdirSync(dirname(profilePath), { recursive: true });
      writeFileSync(profilePath, JSON.stringify(profile));
    }
  } finally {
    session?.disconnect();
  }

  return {
    medianMs: median(totals),
    coldStartMs,
    maxRSS: process.resourceUsage().maxRSS,
    outputHashes,
    perFileMedianMs: Object.fromEntries(
      Object.entries(perFile).map(([name, samples]) => [name, median(samples)])
    ),
  };
}

async function main() {
  const { values } = parseArgs({
    options: {
      case: { type: 'string' },
      module: { type: 'string' },
      preset: { type: 'string', default: 'default' },
      dir: { type: 'string' },
      profile: { type: 'string' },
    },
  });
  if (values.case && values.dir) {
    throw new Error('--case and --dir cannot be used together');
  }
  if (values.case && !values.module) {
    throw new Error('--case needs --module, the file that defines the case');
  }
  if (values.module && !values.case) {
    throw new Error('--module needs --case, the case to run from it');
  }
  const benchmarkCase = values.case
    ? await loadCase(values.case, values.module)
    : null;
  const corpus = selectCorpus(values.case, benchmarkCase, values.dir);
  const processor = createProcessor(benchmarkCase, values.preset);
  const result = await measureProcess(corpus, processor, {
    profilePath: values.profile,
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (process.argv[1] === import.meta.filename) {
  try {
    await main();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
