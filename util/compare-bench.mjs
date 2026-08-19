// Compares two bench.mjs JSON snapshots and prints the per-framework and
// total delta, so a candidate change can be judged against a baseline
// without eyeballing two separate console tables.
//
// Usage:
//   node util/compare-bench.mjs <baseline> <candidate>
//
// Each argument is either a path to a snapshot file, or a bare label that
// resolves to ../bench-results/<label>.json (the same labels bench.mjs
// writes with --label).
//
//   node util/compare-bench.mjs baseline after-fix
//   node util/compare-bench.mjs bench-results/baseline.json bench-results/after-fix.json
//
// pnpm equivalent: `pnpm bench:compare -- <baseline> <candidate>`.

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const RESULTS_DIR = join(import.meta.dirname, '..', 'bench-results');

function resolveSnapshot(arg) {
  if (existsSync(arg)) return arg;
  const asLabel = join(RESULTS_DIR, `${arg}.json`);
  if (existsSync(asLabel)) return asLabel;
  throw new Error(
    `no snapshot found for "${arg}" (tried "${arg}" and "${asLabel}")`
  );
}

function load(arg) {
  return JSON.parse(readFileSync(resolveSnapshot(arg), 'utf8'));
}

function pctDelta(base, candidate) {
  return ((candidate - base) / base) * 100;
}

function fmtMs(ms) {
  return ms.toFixed(2).padStart(9) + ' ms';
}

function fmtPct(pct) {
  const s = (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
  return s.padStart(8);
}

const [baseArg, candArg] = process.argv.slice(2);
if (!baseArg || !candArg) {
  console.error(
    'usage: node util/compare-bench.mjs <baseline> <candidate>\n' +
      '  each arg is a path to a snapshot or a --label passed to bench.mjs'
  );
  process.exit(1);
}

const base = load(baseArg);
const cand = load(candArg);

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

if (missingInCand.length) {
  console.log(`\nonly in baseline (skipped): ${missingInCand.join(', ')}`);
}
if (missingInBase.length) {
  console.log(`only in candidate (skipped): ${missingInBase.join(', ')}`);
}
