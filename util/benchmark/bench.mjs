// Baseline benchmark harness for cssnano.
//
// Runs the default preset over every CSS file in a corpus directory for a fixed
// number of warmup + measured iterations and prints a per-file + total summary.
// Writes a JSON snapshot to ../../bench-results/<label>.json so different
// branches/optimizations can be compared — see compare-bench.mjs.
//
// Defaults to the `frameworks/*.css` corpus already committed for the
// integration fixtures; pass --dir to point at any other folder of .css files.
//
// Usage:
//   node util/benchmark/bench.mjs                    # label = "baseline", dir = ../../frameworks
//   node util/benchmark/bench.mjs --dir=path/to/css  # corpus directory
//   node util/benchmark/bench.mjs --label=foo        # label = "foo"
//   node util/benchmark/bench.mjs --iters=30         # measured iterations per file
//   node util/benchmark/bench.mjs --warmup=5         # warmup iterations per file
//   node util/benchmark/bench.mjs --only=bootstrap   # substring filter on file name
//   node util/benchmark/bench.mjs --mode=quick       # warmup=2, iters=5
//   node util/benchmark/bench.mjs --summary          # concise output
//   node util/benchmark/bench.mjs --runs=3           # repeat and aggregate medians
//   node util/benchmark/bench.mjs --compare=before   # compare after writing snapshot
//   node util/benchmark/bench.mjs --profile --only=bootstrap-v4  # also write a .cpuprofile
//                                                       # per matched file, covering
//                                                       # only the measured (not
//                                                       # warmup) iterations —
//                                                       # analyze with analyze-cpuprofile.mjs
//
// pnpm equivalents: `pnpm bench`, `pnpm bench:profile`, `pnpm bench:compare`,
// `pnpm bench:analyze` — pass flags after `--`, e.g. `pnpm bench -- --label=foo`.
//
// Profiling every file in a large corpus is rarely useful and slows the run
// down noticeably (the inspector session adds overhead of its own) — combine
// --profile with --only to target the framework you actually want to look at,
// and consider a smaller --iters since a profile only needs enough samples to
// be representative, not a stable percentile.

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { createRequire } from 'node:module';
import { parseArgs } from 'node:util';
import { Session } from 'node:inspector/promises';
import { benchmarkCases } from './bench-cases.mjs';

const require = createRequire(import.meta.url);
const cssnano = require('../../packages/cssnano/src/index.js');

// Default corpus directory. Override with `--dir=<path>` to point at any other
// folder of .css files.
const DEFAULT_DIR = join(import.meta.dirname, '..', '..', 'frameworks');
const RESULTS_DIR = join(import.meta.dirname, '..', '..', 'bench-results');
const finalizationMode =
  process.env.NODE_ENV === 'production' ? 'production' : 'development';

function quantile(sorted, q) {
  const idx = (sorted.length - 1) * q;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function stats(samples) {
  const sorted = [...samples].toSorted((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    n: sorted.length,
    min: sorted[0],
    median: quantile(sorted, 0.5),
    mean: sum / sorted.length,
    p95: quantile(sorted, 0.95),
    max: sorted[sorted.length - 1],
  };
}

function fmtMs(ms) {
  return ms.toFixed(2).padStart(8) + ' ms';
}

function corpusManifest(files) {
  const manifest = createHash('sha256');
  for (const file of files) {
    manifest.update(file.name);
    manifest.update('\0');
    manifest.update(createHash('sha256').update(file.source).digest('hex'));
    manifest.update('\n');
  }
  return manifest.digest('hex');
}

function gitRevision() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: join(import.meta.dirname, '..'),
      encoding: 'utf8',
    }).trim();
  } catch {
    return null;
  }
}

async function benchOne(name, source, processor, iters, warmup, profilePath) {
  // Warmup — let V8 optimize hot paths before we measure.
  for (let i = 0; i < warmup; i++) {
    const res = await processor.process(source, { from: undefined });
    // Reading the lazy `res.css` getter runs stringification; `void` silences the unused-expression lint.
    void res.css;
  }

  // Started after warmup so JIT warmup noise doesn't dilute the profile.
  let session;
  let profiling = false;

  try {
    if (profilePath) {
      session = new Session();
      session.connect();
      await session.post('Profiler.enable');
      await session.post('Profiler.start');
      profiling = true;
    }

    const samples = Array.from({ length: iters });
    for (let i = 0; i < iters; i++) {
      const t0 = performance.now();
      const res = await processor.process(source, { from: undefined });
      void res.css;
      samples[i] = performance.now() - t0;
    }

    if (session) {
      const { profile } = await session.post('Profiler.stop');
      profiling = false;
      writeFileSync(profilePath, JSON.stringify(profile));
    }

    const s = stats(samples);
    const throughputKBs = source.length / 1024 / (s.median / 1000);
    return {
      name,
      bytes: source.length,
      ...s,
      samples,
      kbPerSec: throughputKBs,
    };
  } finally {
    if (session) {
      if (profiling) {
        try {
          await session.post('Profiler.stop');
        } catch {
          // The inspector may already be closed while handling another error.
        }
      }
      session.disconnect();
    }
  }
}

function positiveInteger(value, name, allowZero = false) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || (!allowZero && number === 0)) {
    throw new Error(
      `${name} must be a ${allowZero ? 'non-negative' : 'positive'} integer`
    );
  }
  return number;
}

function validateArgs(args) {
  if (!args.label || /[\\/]/.test(args.label)) {
    throw new Error('--label must be a non-empty filename component');
  }
  if (!['default', 'advanced', 'lite'].includes(args.preset)) {
    throw new Error(
      `unknown preset "${args.preset}"; expected default, advanced, or lite`
    );
  }
  if (args.case && !benchmarkCases[args.case]) {
    throw new Error(`unknown benchmark case "${args.case}"`);
  }
  if (args.case && args.dir) {
    throw new Error('--case and --dir cannot be used together');
  }
  if (args.mode && !['quick', 'stable'].includes(args.mode)) {
    throw new Error(`unknown mode "${args.mode}"; expected quick or stable`);
  }
  if (args.runs < 1) {
    throw new Error('--runs must be a positive integer');
  }
}

function runComparison(label, compare, markdown) {
  const compareScript = join(import.meta.dirname, 'compare-bench.mjs');
  const compareArgs = [compareScript, compare, label];
  if (markdown) compareArgs.push(`--markdown=${markdown}`);
  execFileSync(process.execPath, compareArgs, { stdio: 'inherit' });
}

const MODES = {
  quick: { warmup: 2, iters: 5 },
  stable: { warmup: 20, iters: 100 },
};

function resolvedCount(value, fallback, name, allowZero = false) {
  return positiveInteger(value ?? String(fallback), name, allowZero);
}

async function runOnce(args, corpus, processor, snapshotLabel) {
  const benchmarkCase = args.case ? benchmarkCases[args.case] : null;
  const target = benchmarkCase ? benchmarkCase.plugin : 'cssnano';
  if (!args.summary) {
    console.log(
      `cssnano ${target} benchmark — preset=${args.preset}, node ${process.version}, ` +
        `${corpus.length} files, warmup=${args.warmup}, iters=${args.iters}, ` +
        `finalization=${finalizationMode}`
    );
    console.log();
    console.log(
      'framework'.padEnd(28) +
        'size'.padStart(10) +
        'median'.padStart(12) +
        'min'.padStart(12) +
        'p95'.padStart(12) +
        'kB/s'.padStart(10)
    );
    console.log('-'.repeat(84));
  }

  if (args.profile) mkdirSync(RESULTS_DIR, { recursive: true });
  const results = [];
  const totalSamples = Array.from({ length: args.iters });
  for (const { name, source } of corpus) {
    const profilePath = args.profile
      ? join(RESULTS_DIR, `${snapshotLabel}-${name}.cpuprofile`)
      : null;
    const r = await benchOne(
      name,
      source,
      processor,
      args.iters,
      args.warmup,
      profilePath
    );
    for (let i = 0; i < args.iters; i++)
      totalSamples[i] = (totalSamples[i] || 0) + r.samples[i];
    results.push(r);
    if (!args.summary) {
      console.log(
        r.name.padEnd(28) +
          (r.bytes / 1024).toFixed(1).padStart(8) +
          ' k' +
          fmtMs(r.median).padStart(12) +
          fmtMs(r.min).padStart(12) +
          fmtMs(r.p95).padStart(12) +
          r.kbPerSec.toFixed(0).padStart(10)
      );
      if (profilePath) console.log(`  wrote ${profilePath}`);
    }
  }

  const totalBytes = results.reduce((a, r) => a + r.bytes, 0);
  const total = stats(totalSamples);
  if (!args.summary) {
    console.log('-'.repeat(84));
    console.log(
      'TOTAL'.padEnd(28) +
        (totalBytes / 1024).toFixed(1).padStart(8) +
        ' k' +
        fmtMs(total.median).padStart(12) +
        fmtMs(total.min).padStart(12) +
        ''.padStart(12) +
        (totalBytes / 1024 / (total.median / 1000)).toFixed(0).padStart(10)
    );
  }

  mkdirSync(RESULTS_DIR, { recursive: true });
  const out = {
    label: snapshotLabel,
    preset: args.preset,
    target,
    corpusManifest: corpusManifest(corpus),
    gitRevision: gitRevision(),
    node: process.version,
    finalizationMode,
    platform: process.platform,
    arch: process.arch,
    timestamp: new Date().toISOString(),
    arguments: process.argv.slice(2),
    mode: args.mode ?? null,
    warmup: args.warmup,
    iters: args.iters,
    total: {
      bytes: totalBytes,
      medianMs: total.median,
      minMs: total.min,
      kbPerSec: totalBytes / 1024 / (total.median / 1000),
    },
    frameworks: results.map((r) => ({
      name: r.name,
      bytes: r.bytes,
      n: r.n,
      min: r.min,
      median: r.median,
      mean: r.mean,
      p95: r.p95,
      max: r.max,
      kbPerSec: r.kbPerSec,
    })),
  };
  const outPath = join(RESULTS_DIR, `${snapshotLabel}.json`);
  writeFileSync(outPath, JSON.stringify(out, null, 2));
  if (args.summary) {
    const largest = [...out.frameworks]
      .toSorted((a, b) => b.median - a.median)
      .slice(0, 5);
    console.log(`total: ${fmtMs(total.median).trim()}`);
    for (const entry of largest)
      console.log(`  ${entry.name}: ${fmtMs(entry.median).trim()}`);
  }
  console.log(`\nwrote ${outPath}`);
  return out;
}

function selectCorpus(args, dir) {
  const corpus = args.case
    ? [{ name: args.case, source: benchmarkCases[args.case].css }]
    : readdirSync(dir)
        .filter((f) => f.endsWith('.css'))
        .filter((f) => !args.only || f.includes(args.only))
        .toSorted()
        .map((file) => ({
          name: basename(file, '.css'),
          source: readFileSync(join(dir, file), 'utf8'),
        }));
  if (!corpus.length) throw new Error('selected corpus contains no CSS files');
  return corpus;
}

function aggregateSnapshots(snapshots, label, runs) {
  const aggregate = structuredClone(snapshots[0]);
  aggregate.label = label;
  aggregate.timestamp = new Date().toISOString();
  for (const field of ['medianMs', 'minMs', 'kbPerSec']) {
    aggregate.total[field] = quantile(
      snapshots.map((s) => s.total[field]).toSorted((a, b) => a - b),
      0.5
    );
  }
  aggregate.frameworks = aggregate.frameworks.map((entry, index) => {
    const aggregated = {};
    for (const field of ['min', 'median', 'mean', 'p95', 'max', 'kbPerSec']) {
      const values = snapshots
        .map((s) => s.frameworks[index][field])
        .toSorted((a, b) => a - b);
      aggregated[field] = quantile(values, 0.5);
    }
    return { ...entry, ...aggregated };
  });
  writeFileSync(
    join(RESULTS_DIR, `${label}.json`),
    JSON.stringify(aggregate, null, 2)
  );
  console.log(
    `median of ${runs} runs: ${fmtMs(aggregate.total.medianMs).trim()}`
  );
}

function parseBenchmarkArgs() {
  const { values } = parseArgs({
    args: process.argv.slice(2).filter((arg) => arg !== '--'),
    options: {
      label: { type: 'string', default: 'baseline' },
      iters: { type: 'string' },
      warmup: { type: 'string' },
      only: { type: 'string' },
      dir: { type: 'string' },
      profile: { type: 'boolean', default: false },
      preset: { type: 'string', default: 'default' },
      case: { type: 'string' },
      mode: { type: 'string' },
      compare: { type: 'string' },
      markdown: { type: 'string' },
      summary: { type: 'boolean', default: false },
      runs: { type: 'string', default: '1' },
    },
  });
  const args = {
    label: values.label,
    iters: values.iters,
    warmup: values.warmup,
    only: values.only ?? null,
    dir: values.dir ?? null,
    profile: values.profile,
    preset: values.preset,
    case: values.case ?? null,
    mode: values.mode ?? null,
    compare: values.compare ?? null,
    markdown: values.markdown ?? null,
    summary: values.summary,
    runs: positiveInteger(values.runs, '--runs'),
  };
  validateArgs(args);
  const mode = args.mode ? MODES[args.mode] : null;
  args.iters = resolvedCount(args.iters, mode?.iters ?? 15, '--iters');
  args.warmup = resolvedCount(args.warmup, mode?.warmup ?? 3, '--warmup', true);
  return args;
}

function createBenchmarkProcessor(args) {
  const benchmarkCase = args.case ? benchmarkCases[args.case] : null;
  const processorFactory = benchmarkCase?.createProcessor;
  return processorFactory
    ? () => processorFactory()
    : () => cssnano({ preset: args.preset });
}

async function main() {
  const args = parseBenchmarkArgs();
  const dir = args.dir ? resolve(args.dir) : DEFAULT_DIR;

  const corpus = selectCorpus(args, dir);

  if (args.profile && !args.case && corpus.length !== 1) {
    throw new Error(
      '--profile requires exactly one selected fixture (--only or --case)'
    );
  }
  const createProcessor = createBenchmarkProcessor(args);
  const snapshots = [];
  for (let run = 1; run <= args.runs; run++) {
    const snapshotLabel = args.runs === 1 ? args.label : `${args.label}-${run}`;
    snapshots.push(
      await runOnce(args, corpus, createProcessor(), snapshotLabel)
    );
  }

  const candidateLabel = args.label;
  if (args.runs > 1) {
    aggregateSnapshots(snapshots, args.label, args.runs);
  }
  if (args.compare) runComparison(candidateLabel, args.compare, args.markdown);
}

try {
  await main();
} catch (e) {
  console.error(e);
  process.exit(1);
}
