// Baseline benchmark harness for cssnano.
//
// Runs the default preset over every CSS file in a corpus directory for a fixed
// number of warmup + measured iterations and prints a per-file + total summary.
// Writes a JSON snapshot to ../bench-results/<label>.json so different
// branches/optimizations can be compared — see compare-bench.mjs.
//
// Defaults to the `frameworks/*.css` corpus already committed for the
// integration fixtures; pass --dir to point at any other folder of .css files.
//
// Usage:
//   node util/bench.mjs                    # label = "baseline", dir = ../frameworks
//   node util/bench.mjs --dir=path/to/css  # corpus directory
//   node util/bench.mjs --label=foo        # label = "foo"
//   node util/bench.mjs --iters=30         # measured iterations per file
//   node util/bench.mjs --warmup=5         # warmup iterations per file
//   node util/bench.mjs --only=bootstrap   # substring filter on file name
//   node util/bench.mjs --profile --only=bootstrap-v4  # also write a .cpuprofile
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

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { createRequire } from 'node:module';
import { parseArgs } from 'node:util';
import { Session } from 'node:inspector/promises';

const require = createRequire(import.meta.url);
const cssnano = require('../packages/cssnano/src/index.js');

// Default corpus directory. Override with `--dir=<path>` to point at any other
// folder of .css files.
const DEFAULT_DIR = join(import.meta.dirname, '..', 'frameworks');
const RESULTS_DIR = join(import.meta.dirname, '..', 'bench-results');

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

async function benchOne(name, source, processor, iters, warmup, profilePath) {
  // Warmup — let V8 optimize hot paths before we measure.
  for (let i = 0; i < warmup; i++) {
    const res = await processor.process(source, { from: undefined });
    // Reading the lazy `res.css` getter runs stringification; `void` silences the unused-expression lint.
    void res.css;
  }

  // Started after warmup so JIT warmup noise doesn't dilute the profile.
  let session;
  if (profilePath) {
    session = new Session();
    session.connect();
    await session.post('Profiler.enable');
    await session.post('Profiler.start');
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
    session.disconnect();
    writeFileSync(profilePath, JSON.stringify(profile));
  }

  const s = stats(samples);
  const throughputKBs = source.length / 1024 / (s.median / 1000);
  return { name, bytes: source.length, samples, ...s, kbPerSec: throughputKBs };
}

async function main() {
  const { values } = parseArgs({
    options: {
      label: { type: 'string', default: 'baseline' },
      iters: { type: 'string', default: '15' },
      warmup: { type: 'string', default: '3' },
      only: { type: 'string' },
      dir: { type: 'string' },
      profile: { type: 'boolean', default: false },
    },
  });
  const args = {
    label: values.label,
    iters: Number(values.iters),
    warmup: Number(values.warmup),
    only: values.only ?? null,
    dir: values.dir ?? null,
    profile: values.profile,
  };
  const dir = args.dir ? resolve(args.dir) : DEFAULT_DIR;

  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.css'))
    .filter((f) => !args.only || f.includes(args.only))
    .toSorted();

  const processor = cssnano({ preset: 'default' });

  console.log(
    `cssnano baseline benchmark — node ${process.version}, ` +
      `${files.length} files, warmup=${args.warmup}, iters=${args.iters}`
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

  if (args.profile) {
    mkdirSync(RESULTS_DIR, { recursive: true });
  }

  const results = [];
  for (const f of files) {
    const source = readFileSync(join(dir, f), 'utf8');
    const name = basename(f, '.css');
    const profilePath = args.profile
      ? join(RESULTS_DIR, `${args.label}-${name}.cpuprofile`)
      : null;
    const r = await benchOne(
      name,
      source,
      processor,
      args.iters,
      args.warmup,
      profilePath
    );
    results.push(r);
    console.log(
      r.name.padEnd(28) +
        (r.bytes / 1024).toFixed(1).padStart(8) +
        ' k' +
        fmtMs(r.median).padStart(12) +
        fmtMs(r.min).padStart(12) +
        fmtMs(r.p95).padStart(12) +
        r.kbPerSec.toFixed(0).padStart(10)
    );
    if (profilePath) {
      console.log(`  wrote ${profilePath}`);
    }
  }

  const totalBytes = results.reduce((a, r) => a + r.bytes, 0);
  const totalMedian = results.reduce((a, r) => a + r.median, 0);
  const totalMin = results.reduce((a, r) => a + r.min, 0);
  console.log('-'.repeat(84));
  console.log(
    'TOTAL'.padEnd(28) +
      (totalBytes / 1024).toFixed(1).padStart(8) +
      ' k' +
      fmtMs(totalMedian).padStart(12) +
      fmtMs(totalMin).padStart(12) +
      ''.padStart(12) +
      (totalBytes / 1024 / (totalMedian / 1000)).toFixed(0).padStart(10)
  );

  // Persist JSON for later comparison.
  mkdirSync(RESULTS_DIR, { recursive: true });
  const out = {
    label: args.label,
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    timestamp: new Date().toISOString(),
    warmup: args.warmup,
    iters: args.iters,
    total: {
      bytes: totalBytes,
      medianMs: totalMedian,
      minMs: totalMin,
      kbPerSec: totalBytes / 1024 / (totalMedian / 1000),
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
  const outPath = join(RESULTS_DIR, `${args.label}.json`);
  writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`\nwrote ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
