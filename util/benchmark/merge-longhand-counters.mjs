// Benchmark-only operation counters for postcss-merge-longhand.
//
// Runs the default preset over the framework corpus (or one focused case) and
// reports per-file totals for full-rule scans, mergeRules() calls, cloned
// rules, synthesized declarations, and pass entries, plus output hashes.
//
//   NODE_ENV=production node util/benchmark/merge-longhand-counters.mjs
//   NODE_ENV=production node util/benchmark/merge-longhand-counters.mjs --case merge-longhand-noop-singles
//
// Never imported by production code.

import { register } from 'node:module';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import {
  parseCounterArgs,
  validateComparisonCorpus,
} from './merge-longhand-counters-compare.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');

/* Register the seam loader before the plugin module graph loads. */
register(new URL('./merge-longhand-counters-loader.mjs', import.meta.url));

const PASS_KEYS = [
  'mergeSideComponentsToSide',
  'mergeSideComponentsToComponent',
  'mergeSidesToComponents',
  'mergeComponentsToBorder',
  'mergeComponentsToBorderAndSides',
  'mergeSidesToBorder',
  'rebindSideCustomProp',
  'rebindComponentCustomProp',
  'optimizeSides',
  'mergeRedundantSweep',
  'hoistSubsumedComponents',
];

/**
 * @return {Record<string, number> & {pass: Record<string, number>}}
 */
function newCounterState() {
  const pass = Object.fromEntries(PASS_KEYS.map((key) => [key, 0]));
  return {
    mergeRules: 0,
    insertCloned: 0,
    getDecls: 0,
    cleanupDeclarations: 0,
    rewrite: 0,
    explodeBorder: 0,
    mergeBorder: 0,
    cleanupBorder: 0,
    explodeBox: 0,
    mergeBox: 0,
    resolveBorderGrid: 0,
    walk: 0,
    walkDecls: 0,
    walkRules: 0,
    ruleClone: 0,
    declClone: 0,
    declRemove: 0,
    removeAll: 0,
    insertAfter: 0,
    insertBefore: 0,
    append: 0,
    prepend: 0,
    pass,
  };
}

/** @type {ReturnType<typeof newCounterState>} */
const counters = newCounterState();
globalThis.mergeLonghandCounters = counters;

/** @param {(name: string) => void} zero */
function reset() {
  for (const [key, value] of Object.entries(counters)) {
    if (typeof value === 'number') {
      counters[key] = 0;
    } else {
      for (const passKey of Object.keys(value)) {
        value[passKey] = 0;
      }
    }
  }
}

/* PostCSS prototype patches count scans, clones, and mutations the module
 * seams cannot see. The benchmark process only runs the plugin, so the shared
 * postcss instance is safe to touch here. */
for (const method of ['walk', 'walkDecls', 'walkRules']) {
  const original = postcss.Container.prototype[method];
  postcss.Container.prototype[method] = function patchedWalk(...args) {
    counters[method]++;
    return original.apply(this, args);
  };
}
{
  const original = postcss.Rule.prototype.clone;
  postcss.Rule.prototype.clone = function patchedRuleClone(...args) {
    counters.ruleClone++;
    return original.apply(this, args);
  };
}
{
  const original = postcss.Declaration.prototype.clone;
  postcss.Declaration.prototype.clone = function patchedDeclClone(...args) {
    counters.declClone++;
    return original.apply(this, args);
  };
}
for (const method of ['insertAfter', 'insertBefore', 'append', 'prepend']) {
  const original = postcss.Container.prototype[method];
  postcss.Container.prototype[method] = function patchedInsert(...args) {
    counters[method]++;
    return original.apply(this, args);
  };
}
{
  const original = postcss.Container.prototype.removeAll;
  postcss.Container.prototype.removeAll = function patchedRemoveAll(...args) {
    counters.removeAll++;
    return original.apply(this, args);
  };
}
{
  const original = postcss.Node.prototype.remove;
  postcss.Node.prototype.remove = function patchedRemove(...args) {
    counters.declRemove++;
    return original.apply(this, args);
  };
}

const { default: cssnano } = await import(
  resolve(repoRoot, 'packages/cssnano/src/index.js')
);
const { corpusManifest } = await import('./bench-corpus.mjs');
const { benchmarkCases } = await import('./bench-cases.mjs');

function formatCounterDelta(base, candidate) {
  const delta = candidate - base;
  let pct;
  if (base === 0) {
    pct = candidate === 0 ? '0.0%' : '+Inf';
  } else {
    pct = `${((delta / base) * 100).toFixed(1)}%`;
  }
  return { delta, pct };
}

function formatComparison(base, cand) {
  validateComparisonCorpus(base, cand);
  const lines = [];
  lines.push('### Operation Counter Comparison');
  lines.push('');
  lines.push(`- Baseline: \`${base.revision?.slice(0, 8) ?? 'baseline'}\``);
  lines.push(`- Candidate: \`${cand.revision?.slice(0, 8) ?? 'candidate'}\``);
  lines.push('');

  const hashDiffs = [];
  for (const bFile of base.files) {
    const cFile = cand.files.find((f) => f.name === bFile.name);
    if (cFile && cFile.hash !== bFile.hash) {
      hashDiffs.push(
        `${bFile.name}: \`${bFile.hash.slice(0, 8)}\` -> \`${cFile.hash.slice(0, 8)}\``
      );
    }
  }
  if (hashDiffs.length === 0) {
    lines.push(
      `- **Output Hashes**: 100% byte-identical across all ${base.files.length} corpus files.`
    );
  } else {
    lines.push(
      `- **Output Hashes**: ${hashDiffs.length} files changed output:`
    );
    for (const d of hashDiffs) lines.push(`  - ${d}`);
  }
  lines.push('');

  lines.push('#### Totals');
  lines.push('');
  lines.push('| Counter Metric | Baseline | Candidate | Delta | % Change |');
  lines.push('| :--- | :--- | :--- | :--- | :--- |');

  const keys = Object.keys(base.totals).filter((k) => k !== 'pass');
  for (const key of keys) {
    const b = base.totals[key] ?? 0;
    const c = cand.totals[key] ?? 0;
    const { delta, pct } = formatCounterDelta(b, c);
    lines.push(
      `| \`${key}\` | ${b.toLocaleString()} | ${c.toLocaleString()} | ${delta > 0 ? '+' : ''}${delta.toLocaleString()} | ${pct} |`
    );
  }
  lines.push('');

  lines.push('#### Pass Invocations');
  lines.push('');
  lines.push('| Pass Name | Baseline | Candidate | Delta | % Change |');
  lines.push('| :--- | :--- | :--- | :--- | :--- |');
  for (const passKey of PASS_KEYS) {
    const b = base.totals.pass?.[passKey] ?? 0;
    const c = cand.totals.pass?.[passKey] ?? 0;
    const { delta, pct } = formatCounterDelta(b, c);
    lines.push(
      `| \`${passKey}\` | ${b.toLocaleString()} | ${c.toLocaleString()} | ${delta > 0 ? '+' : ''}${delta.toLocaleString()} | ${pct} |`
    );
  }
  lines.push('');

  return lines.join('\n');
}

const args = process.argv.slice(2);
const { positional, argCase, argCompare, argOutput, argMarkdown } =
  parseCounterArgs(args);

if (
  positional.length === 2 &&
  positional[0].endsWith('.json') &&
  positional[1].endsWith('.json')
) {
  const base = JSON.parse(
    readFileSync(resolve(repoRoot, positional[0]), 'utf8')
  );
  const cand = JSON.parse(
    readFileSync(resolve(repoRoot, positional[1]), 'utf8')
  );
  const md = formatComparison(base, cand);
  process.stdout.write(`${md}\n`);
  if (argMarkdown) {
    writeFileSync(resolve(repoRoot, argMarkdown), `${md}\n`, 'utf8');
  }
  process.exit(0);
}

/** @type {{name: string, source: string}[]} */
let files;
/** @type {() => import('postcss').Processor} */
let makeProcessor;
if (argCase !== undefined) {
  const entry = benchmarkCases[argCase];
  if (!entry) {
    throw new Error(`unknown benchmark case "${argCase}"`);
  }
  files = [{ name: argCase, source: entry.css }];
  makeProcessor = () => entry.createProcessor();
} else {
  const dir = resolve(repoRoot, 'frameworks');
  files = readdirSync(dir)
    .filter((file) => file.endsWith('.css'))
    .toSorted()
    .map((file) => ({
      name: basename(file, '.css'),
      source: readFileSync(join(dir, file), 'utf8'),
    }));
  makeProcessor = () => cssnano({ preset: 'default' });
}

const processor = makeProcessor();
const revision = execFileSync('git', ['rev-parse', 'HEAD'], {
  encoding: 'utf8',
  cwd: repoRoot,
}).trim();

const fileReports = [];
for (const { name, source } of files) {
  reset();
  const result = await processor.process(source, { from: undefined });
  const hash = createHash('sha256').update(result.css).digest('hex');
  fileReports.push({
    name,
    hash,
    counters: JSON.parse(JSON.stringify(counters)),
  });
}

const totals = newCounterState();
for (const { counters: fileCounters } of fileReports) {
  for (const [key, value] of Object.entries(fileCounters)) {
    if (typeof value === 'number') {
      totals[key] += value;
    } else {
      for (const passKey of Object.keys(value)) {
        totals.pass[passKey] += value[passKey];
      }
    }
  }
}

const report = {
  revision,
  node: process.version,
  corpus: files.map(({ name }) => name),
  corpusManifest: corpusManifest(files),
  files: fileReports,
  totals,
};

if (argOutput) {
  writeFileSync(
    resolve(repoRoot, argOutput),
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8'
  );
}

if (argCompare) {
  const base = JSON.parse(readFileSync(resolve(repoRoot, argCompare), 'utf8'));
  const md = formatComparison(base, report);
  process.stdout.write(`${md}\n`);
  if (argMarkdown) {
    writeFileSync(resolve(repoRoot, argMarkdown), `${md}\n`, 'utf8');
  }
} else if (!argOutput) {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}
