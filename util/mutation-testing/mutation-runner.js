// Measures whether the project's checks notice curated source mutations.
//
//   node util/mutation-testing/mutation-runner.js --group <name> [--out <file>]
//     [--baseline <file>] [--only <regex>]
//
// A group names the catalogs, the check that judges them and whether
// unkilled mutants fail the run (see `groups` in
// packages/cssnano/mutation/catalogs.js). `--group merge` is the merge gate.
//
// Before anything runs, every mutation is applied to its source in memory.
// One that no longer applies is `stale`: it fails the run and nothing else
// runs. Delete or update it in the catalog.
//
// The run writes every status to a results file (`mutation-results/`, or
// `--out`) and ends with one line, `mutation: done status=… <counts>
// results=<file>`, so reading that line is enough. `--baseline <file>`
// compares with the results file of an earlier run and fails when a mutant it
// killed is not killed now. Take the baseline first, at the parent revision.
//
// Lower level, for one-off probes:
//   --all | --catalog <catalog>… [--check test|oracle] [--suites <module>]
//   [--seeds 7,12648430] [--count 300] [--full] [--timeout <ms>]
//   [--allow-unkilled]
// --check test (the default) kills a mutant when the catalog's test file
// fails. --check oracle kills it when a fuzz oracle objects; it takes the
// suites each registry entry declares, or --suites <module> for all catalogs.
//
// An oracle mutant that no case executes is "not reached", and one that runs
// without changing an output is "unchanged": both need another corpus, not
// another oracle. Probe one mutant with --only and a --suites module whose
// generator builds the shape it needs.
//
// --stale-only applies every mutation in memory and stops there: it prints the
// stale fragments and runs no mutant. It writes no results file, so it refuses
// --out, --baseline and --only.
//
// --only keeps the mutants whose "<catalog>: <name>" matches the regex; a
// pattern that matches none fails the run. Survivors, unchanged mutants and
// mutants no run reaches fail the run unless the group or --allow-unkilled
// permits them; errors, timeouts and stale mutants always fail it.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import {
  compareToBaseline,
  doneLine,
  findStale,
  loadCatalogs,
  matchingMutants,
  outcome,
  selectCatalogs,
  selectMutants,
} from './mutation-testing.js';
import * as oracleCheck from './oracle-check.js';
import * as testCheck from './test-check.js';

const { values } = parseArgs({
  options: {
    group: { type: 'string' },
    out: { type: 'string' },
    baseline: { type: 'string' },
    all: { type: 'boolean' },
    catalog: { type: 'string', multiple: true },
    check: { type: 'string' },
    suites: { type: 'string' },
    seeds: { type: 'string', default: '7,12648430' },
    count: { type: 'string', default: '300' },
    only: { type: 'string' },
    full: { type: 'boolean' },
    timeout: { type: 'string' },
    'allow-unkilled': { type: 'boolean' },
    'stale-only': { type: 'boolean' },
  },
});

const checks = { test: testCheck, oracle: oracleCheck };
const resultsDir = join(import.meta.dirname, '..', '..', 'mutation-results');

/**
 * The runs the flags ask for: one per group entry, or one from the flags.
 *
 * @returns {Promise<Array<{check: string, allowUnkilled: boolean, sources: Array<{url: URL, suites?: URL}>}>>}
 */
async function planRuns() {
  const { catalogs, groups } =
    await import('../../packages/cssnano/mutation/catalogs.js');
  if (values.group !== undefined) {
    if (!Object.hasOwn(groups, values.group)) {
      throw new Error(
        `Unknown --group ${values.group}; use ${Object.keys(groups).join(', ')}`
      );
    }
    const conflicting = [
      'check',
      'all',
      'catalog',
      'suites',
      'allow-unkilled',
    ].filter((key) => values[key] !== undefined);
    if (conflicting.length) {
      throw new Error(
        `--${conflicting.join(', --')} cannot be combined with --group: the group sets them`
      );
    }
    const registered = new Map(
      catalogs.map((entry) => [entry.url.href, entry])
    );
    return groups[values.group].map((run) => ({
      check: run.check,
      allowUnkilled: run.allowUnkilled,
      sources: run.catalogs.map((url) => registered.get(url.href)),
    }));
  }
  const check = values.check ?? 'test';
  if (!Object.hasOwn(checks, check)) {
    throw new Error(`Unknown --check ${check}; use test or oracle`);
  }
  const sources = (values.catalog ?? []).map((path) => ({
    url: pathToFileURL(resolve(path)),
  }));
  if (values.all) sources.push(...selectCatalogs(catalogs, check));
  if (!sources.length) {
    throw new Error('Missing required argument --group, --catalog or --all');
  }
  return [
    {
      check,
      allowUnkilled: values['allow-unkilled'] ?? false,
      sources,
    },
  ];
}

const isStale = ({ status }) => status === outcome.stale;

const brief = ({ detail, diagnostic }) =>
  (detail || diagnostic?.split('\n').find(Boolean) || '').slice(0, 200);

function writeResults(results) {
  const stamp = new Date().toISOString().replaceAll(':', '-');
  const label = values.group ?? 'catalogs';
  const path = resolve(
    values.out ?? join(resultsDir, `${stamp}-${label}.json`)
  );
  mkdirSync(dirname(path), { recursive: true });
  const rows = results.map((result) => ({
    name: result.name,
    status: result.status,
    detail: brief(result),
  }));
  writeFileSync(path, JSON.stringify({ label, results: rows }, null, 2));
  return path;
}

// Printed last on every path, so a reader of the output knows the run ended.
let harnessError = testCheck.harnessError;
let total;
let results = [];
let regressions = 0;
let path;
try {
  if (Number(process.versions.node.split('.')[0]) < 24) {
    throw new Error('Mutation testing requires Node 24 or later');
  }
  // Another run may be writing here; a later write would replace its results.
  if (values['stale-only']) {
    const refused = ['out', 'baseline', 'only'].filter(
      (key) => values[key] !== undefined
    );
    if (refused.length) {
      throw new Error(
        `--stale-only cannot be combined with --${refused.join(', --')}`
      );
    }
  }
  if (values.out !== undefined && existsSync(resolve(values.out))) {
    throw new Error(
      `--out ${values.out} already exists; choose another path or remove it`
    );
  }
  const runs = await planRuns();
  const loaded = [];
  for (const run of runs) {
    const catalogs = (
      await loadCatalogs(run.sources.map(({ url }) => url))
    ).map((catalog, index) => ({
      ...catalog,
      suites: run.sources[index].suites,
    }));
    loaded.push({ run, catalogs: matchingMutants(catalogs, values.only) });
  }
  // A group's runs need not all match a pattern; the whole group must.
  selectMutants(
    loaded.flatMap(({ catalogs }) => catalogs),
    values.only
  );
  total = loaded.reduce(
    (n, { catalogs }) =>
      n + catalogs.reduce((m, { mutations }) => m + mutations.length, 0),
    0
  );
  const shown = values.group
    ? `in group ${values.group}`
    : `with --check ${values.check ?? 'test'}`;
  console.log(
    `Running ${total} mutants of ${loaded.reduce((n, { catalogs }) => n + catalogs.length, 0)} catalogs ${shown}`
  );

  const outShown = values['stale-only']
    ? 'none'
    : ((values.out && resolve(values.out)) ?? 'mutation-results/');
  console.log(`mutation: started pid=${process.pid} out=${outShown}`);

  const stale = await findStale(loaded.flatMap(({ catalogs }) => catalogs));
  if (stale.length) {
    results = stale.map(({ name, detail }) => ({
      name,
      status: outcome.stale,
      detail,
    }));
    for (const { name, detail } of stale)
      console.log(`stale: ${name} | ${detail}`);
    process.exitCode = 1;
  } else if (!values['stale-only']) {
    for (const { run, catalogs } of loaded) {
      const check = checks[run.check];
      harnessError = check.harnessError;
      const runnable = catalogs.filter(({ mutations }) => mutations.length);
      if (!runnable.length) continue;
      results.push(
        ...(await check.run(runnable, {
          ...values,
          allowUnkilled: run.allowUnkilled,
          timeout: Number(values.timeout ?? check.defaultTimeout),
        }))
      );
    }
  }
  const notKilled = results.filter(({ status }) => status !== outcome.killed);
  if (notKilled.length) {
    console.log(`mutation: not killed (${notKilled.length}):`);
    for (const result of notKilled) {
      const detail = brief(result);
      console.log(
        `  ${result.status}: ${result.name}${detail ? ` | ${detail}` : ''}`
      );
    }
  }
  path = values['stale-only'] ? undefined : writeResults(results);
  // Stale mutants were never judged, so they cannot be regressions.
  if (values.baseline !== undefined && !results.some(isStale)) {
    const before = JSON.parse(readFileSync(values.baseline, 'utf8')).results;
    for (const change of compareToBaseline(before, results)) {
      const label = change.regression ? 'regression' : 'changed';
      console.log(
        `${label}: ${change.name} | ${change.before} -> ${change.now}`
      );
      if (change.regression) regressions += 1;
    }
    if (regressions) process.exitCode = 1;
  }
} catch (error) {
  console.error(`${harnessError}: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (total === undefined) {
    console.log('mutation: done status=fail');
  } else {
    console.log(
      doneLine({
        failed: Boolean(process.exitCode),
        total,
        results,
        regressions,
        path: path ?? 'none',
      })
    );
  }
}
