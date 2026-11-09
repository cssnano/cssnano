/**
 * Counts the work rule merging does on real and stress inputs: rounds of
 * `runMerge`, sweeps per round, pair checks per rule, and merge attempts. The
 * counts are exact and repeat from run to run, since they are V8's call counts
 * from precise coverage, so the script patches nothing in `src/`. They answer
 * whether the sweeps repeat often enough for a worklist to pay off.
 *
 * Inputs are the framework stylesheets under the default preset, and the merge
 * bench cases under their own processors.
 *
 * Usage: node packages/cssnano/script/passes/merge/rules/roundCounts.js [--json]
 */
import { readdirSync, readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { Session } from 'node:inspector/promises';
import postcss from 'postcss';

/** The function whose calls each count reads, by the module that defines it. */
const COUNTED = /** @type {const} */ ({
  runs: ['/passes/merge/lib/rules/selectorMerger.js', 'runMerge'],
  rounds: ['/passes/merge/lib/rules/scan.js', 'runScan'],
  sweeps: ['/passes/merge/lib/rules/ruleSequence.js', 'RuleSequence'],
  pairChecks: ['/passes/merge/lib/rules/scan.js', 'pairBenefit'],
  mergeAttempts: ['/passes/merge/lib/rules/scan.js', 'mergePair'],
});

/** @typedef {keyof typeof COUNTED} CountName */

/**
 * @param {import('node:inspector').Profiler.ScriptCoverage[]} coverage
 * @return {Record<CountName, number>} the calls of each counted function since
 * the last take
 */
function countsOf(coverage) {
  const counts = /** @type {Record<CountName, number>} */ ({});
  for (const [name, [module, functionName]] of Object.entries(COUNTED)) {
    let calls = 0;
    for (const script of coverage) {
      if (!script.url.endsWith(module)) continue;
      for (const fn of script.functions) {
        // A function's first range spans its body, and its count is the calls.
        if (fn.functionName === functionName) calls += fn.ranges[0].count;
      }
    }
    counts[/** @type {CountName} */ (name)] = calls;
  }
  return counts;
}

const session = new Session();
session.connect();
await session.post('Profiler.enable');
// Coverage starts before the merge modules load, so every call is counted.
await session.post('Profiler.startPreciseCoverage', {
  callCount: true,
  detailed: false,
});

const { default: preset } = await import('../../../../src/presets/default.js');
const { benchmarkCases } =
  await import('../../../../../../util/benchmark/cases/index.js');
const { repositoryFile } =
  await import('../../../../../../util/testHelpers.js');

const frameworksDir = new URL('../../../../../../frameworks/', import.meta.url);

/** @type {{name: string, rules: number, run: () => Promise<unknown>}[]} */
const inputs = [];
for (const file of readdirSync(frameworksDir).toSorted()) {
  const css = readFileSync(new URL(file, frameworksDir), 'utf8');
  inputs.push({
    name: `framework:${basename(file, '.css')}`,
    rules: countRules(css),
    run: () => postcss(preset()).process(css, { from: repositoryFile }),
  });
}
for (const [name, benchCase] of Object.entries(benchmarkCases)) {
  if (!name.startsWith('merge-rules') && !name.startsWith('merge-pass')) {
    continue;
  }
  inputs.push({
    name: `bench:${name}`,
    rules: countRules(benchCase.css),
    run: () =>
      benchCase.createProcessor().process(benchCase.css, { from: undefined }),
  });
}

/**
 * @param {string} css
 * @return {number} the rules of the input, before any transform
 */
function countRules(css) {
  let rules = 0;
  postcss.parse(css).walkRules(() => {
    rules++;
  });
  return rules;
}

// A take resets the counts, so this one drops the calls the imports made.
await session.post('Profiler.takePreciseCoverage');
const json = process.argv.includes('--json');
let counted = 0;
if (!json) {
  console.log(
    'input\trules\truns\trounds\tsweeps\tsweeps/round\tpairChecks/rule\tmergeAttempts'
  );
}
for (const { name, rules, run } of inputs) {
  await run();
  const { result } = await session.post('Profiler.takePreciseCoverage');
  const counts = countsOf(result);
  counted += counts.runs;
  const row = {
    input: name,
    rules,
    ...counts,
    sweepsPerRound: counts.rounds ? counts.sweeps / counts.rounds : 0,
    pairChecksPerRule: rules ? counts.pairChecks / rules : 0,
  };
  console.log(
    json
      ? JSON.stringify(row)
      : [
          name,
          rules,
          counts.runs,
          counts.rounds,
          counts.sweeps,
          row.sweepsPerRound.toFixed(2),
          row.pairChecksPerRule.toFixed(2),
          counts.mergeAttempts,
        ].join('\t')
  );
}
await session.post('Profiler.stopPreciseCoverage');
session.disconnect();
// A renamed function or module counts nothing, which must not pass as zero work.
if (counted === 0) {
  console.error('round-counts: no run of runMerge was counted; check COUNTED');
  process.exitCode = 1;
}
