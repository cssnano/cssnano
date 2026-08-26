// Compares two bench.mjs JSON snapshots and prints the per-framework and
// total delta, so a candidate change can be judged against a baseline
// without eyeballing two separate console tables.
//
// Usage:
//   node util/benchmark/compare-bench.mjs <baseline> <candidate>
//
// Each argument is either a path to a snapshot file, or a bare label that
// resolves to ../bench-results/<label>.json (the same labels bench.mjs
// writes with --label).
//
//   node util/benchmark/compare-bench.mjs baseline after-fix
//   node util/benchmark/compare-bench.mjs bench-results/baseline.json bench-results/after-fix.json
//
// pnpm equivalent: `pnpm bench:compare -- <baseline> <candidate>`.
// Pass --markdown=path to also write a GitHub-flavored Markdown summary.

import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const RESULTS_DIR = join(import.meta.dirname, '..', '..', 'bench-results');

function resolveSnapshot(arg) {
  if (existsSync(arg)) return arg;
  const asLabel = join(RESULTS_DIR, `${arg}.json`);
  if (existsSync(asLabel)) return asLabel;
  throw new Error(
    `no snapshot found for "${arg}" (tried "${arg}" and "${asLabel}")`
  );
}

function load(arg) {
  const snapshot = JSON.parse(readFileSync(resolveSnapshot(arg), 'utf8'));
  if (
    !snapshot ||
    typeof snapshot !== 'object' ||
    !Array.isArray(snapshot.frameworks) ||
    !snapshot.frameworks.length ||
    !snapshot.total ||
    !Number.isFinite(snapshot.total.medianMs)
  ) {
    throw new TypeError(`invalid benchmark snapshot: "${arg}"`);
  }
  for (const framework of snapshot.frameworks) {
    if (
      typeof framework.name !== 'string' ||
      !Number.isFinite(framework.bytes) ||
      !Number.isFinite(framework.median)
    ) {
      throw new TypeError(`invalid benchmark entry in snapshot: "${arg}"`);
    }
  }
  if (
    new Set(snapshot.frameworks.map((framework) => framework.name)).size !==
    snapshot.frameworks.length
  ) {
    throw new Error(`duplicate benchmark entry in snapshot: "${arg}"`);
  }
  return snapshot;
}

function pctDelta(base, candidate) {
  if (base === 0) return candidate === 0 ? 0 : Infinity;
  return ((candidate - base) / base) * 100;
}

function fmtMs(ms) {
  return ms.toFixed(2).padStart(9) + ' ms';
}

function fmtPct(pct) {
  const s = (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
  return s.padStart(8);
}

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const [baseArg, candArg] = args;
if (!baseArg || !candArg) {
  console.error(
    'usage: node util/benchmark/compare-bench.mjs <baseline> <candidate>\n' +
      '  each arg is a path to a snapshot or a --label passed to bench.mjs'
  );
  process.exit(1);
}

const base = load(baseArg);
const cand = load(candArg);

for (const field of [
  'preset',
  'corpusManifest',
  'target',
  'node',
  'platform',
  'arch',
  'iters',
  'warmup',
]) {
  if (
    typeof base[field] === 'undefined' ||
    typeof cand[field] === 'undefined'
  ) {
    throw new TypeError(
      `incompatible snapshots: ${field} metadata is required`
    );
  }
  if (base[field] !== cand[field]) {
    throw new Error(
      `incompatible snapshots: ${field} differs (${base[field] ?? 'missing'} vs ${cand[field] ?? 'missing'})`
    );
  }
}

console.log(`baseline:  ${base.label} (${resolveSnapshot(baseArg)})`);
console.log(`candidate: ${cand.label} (${resolveSnapshot(candArg)})`);
console.log();
console.log(
  'framework'.padEnd(28) +
    'base median'.padStart(14) +
    'cand median'.padStart(14) +
    'delta'.padStart(10)
);
console.log('-'.repeat(66));

const baseByName = new Map(base.frameworks.map((f) => [f.name, f]));
const candByName = new Map(cand.frameworks.map((f) => [f.name, f]));

const names = [...baseByName.keys()].filter((n) => candByName.has(n));
const missingInCand = [...baseByName.keys()].filter((n) => !candByName.has(n));
const missingInBase = [...candByName.keys()].filter((n) => !baseByName.has(n));

if (missingInCand.length || missingInBase.length) {
  throw new Error(
    `incompatible snapshots: corpus entries differ (baseline-only: ${missingInCand.join(', ') || 'none'}; candidate-only: ${missingInBase.join(', ') || 'none'})`
  );
}
for (const name of names) {
  if (baseByName.get(name).bytes !== candByName.get(name).bytes) {
    throw new Error(`incompatible snapshots: byte size differs for "${name}"`);
  }
}

// Biggest regressions first, so a slowdown can't hide at the bottom of a long corpus.
const rows = names
  .map((name) => {
    const b = baseByName.get(name);
    const c = candByName.get(name);
    return {
      name,
      base: b.median,
      cand: c.median,
      pct: pctDelta(b.median, c.median),
    };
  })
  .toSorted((a, b) => b.pct - a.pct);

for (const r of rows) {
  console.log(
    r.name.padEnd(28) + fmtMs(r.base) + fmtMs(r.cand) + fmtPct(r.pct)
  );
}

console.log('-'.repeat(66));
const totalPct = pctDelta(base.total.medianMs, cand.total.medianMs);
console.log(
  'TOTAL'.padEnd(28) +
    fmtMs(base.total.medianMs) +
    fmtMs(cand.total.medianMs) +
    fmtPct(totalPct)
);

function markdownRow(row) {
  return `| ${row.name} | ${row.base.toFixed(2)} ms | ${row.cand.toFixed(2)} ms | ${fmtPct(row.pct).trim()} |`;
}

const markdown = [
  '## cssnano performance comparison',
  '',
  `- Preset: \`${base.preset}\``,
  `- Target: \`${base.target}\``,
  `- Corpus manifest: \`${base.corpusManifest}\``,
  `- Baseline: \`${base.label}\` (${base.gitRevision ?? 'unknown revision'})`,
  `- Candidate: \`${cand.label}\` (${cand.gitRevision ?? 'unknown revision'})`,
  '',
  '| Corpus entry | Base median | Candidate median | Delta |',
  '| --- | ---: | ---: | ---: |',
  ...rows.map(markdownRow),
  `| **TOTAL** | **${base.total.medianMs.toFixed(2)} ms** | **${cand.total.medianMs.toFixed(2)} ms** | **${fmtPct(totalPct).trim()}** |`,
  '',
].join('\n');

const markdownArg = args.find((arg) => arg.startsWith('--markdown='));
if (markdownArg) {
  writeFileSync(markdownArg.slice('--markdown='.length), markdown);
}
