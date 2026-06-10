// Baseline benchmark harness for cssnano.
//
// Runs the default preset over every CSS file in a corpus directory for a fixed
// number of warmup + measured iterations and prints a per-file + total summary.
// Writes a JSON snapshot to ../bench-results/<label>.json so different
// branches/optimizations can be compared.
//
// The corpus is not committed; pass --dir to point at any folder of .css files
// (defaults to ../frameworks).
//
// Usage:
//   node util/bench.mjs                    # label = "baseline", dir = ../frameworks
//   node util/bench.mjs --dir=path/to/css  # corpus directory
//   node util/bench.mjs --label=foo        # label = "foo"
//   node util/bench.mjs --iters=30         # measured iterations per file
//   node util/bench.mjs --warmup=5         # warmup iterations per file
//   node util/bench.mjs --only=bootstrap   # substring filter on file name

import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname, basename, resolve } from 'path';
import { fileURLToPath } from 'url';
import { performance } from 'perf_hooks';
import { createRequire } from 'module';
import { parseArgs } from 'node:util';

const require = createRequire(import.meta.url);
const cssnano = require('../packages/cssnano/src/index.js');

const __dirname = dirname(fileURLToPath(import.meta.url));
// Default corpus directory. Override with `--dir=<path>` to point at any folder
// of .css files (the corpus itself is not committed).
const DEFAULT_DIR = join(__dirname, '..', 'frameworks');
const RESULTS_DIR = join(__dirname, '..', 'bench-results');

function quantile(sorted, q) {
  const idx = (sorted.length - 1) * q;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function stats(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
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

async function benchOne(name, source, processor, iters, warmup) {
  // Warmup — let V8 optimize hot paths before we measure.
  for (let i = 0; i < warmup; i++) {
    const res = await processor.process(source, { from: undefined });
    // Reading the lazy `res.css` getter runs stringification; `void` silences the unused-expression lint.
    void res.css;
  }

  const samples = new Array(iters);
  for (let i = 0; i < iters; i++) {
    const t0 = performance.now();
    const res = await processor.process(source, { from: undefined });
    void res.css;
    samples[i] = performance.now() - t0;
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
    },
  });
  const args = {
    label: values.label,
    iters: Number(values.iters),
    warmup: Number(values.warmup),
    only: values.only ?? null,
    dir: values.dir ?? null,
  };
  const dir = args.dir ? resolve(args.dir) : DEFAULT_DIR;

  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.css'))
    .filter((f) => !args.only || f.includes(args.only))
    .sort();

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

  const results = [];
  for (const f of files) {
    const source = readFileSync(join(dir, f), 'utf8');
    const r = await benchOne(
      basename(f, '.css'),
      source,
      processor,
      args.iters,
      args.warmup
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
