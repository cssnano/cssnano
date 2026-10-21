// Measures whether the project's checks notice curated source mutations.
//
// node util/mutation-testing/mutation-runner.js (--all | --catalog <catalog>…)
//   [--check test|oracle] [--only <regex>] [--timeout <ms>] [--allow-unkilled]
//
// --check test (the default) kills a mutant when the catalog's test file
// fails. --check oracle kills it when a fuzz oracle objects; it takes the
// suites each registry entry declares, or --suites <module> for all catalogs,
// and these options:
//   [--suites <module>] [--seeds 7,12648430] [--count 300] [--full]
//
// An oracle mutant that no case executes is "not reached", and one that runs
// without changing an output is "unchanged": both need another corpus, not
// another oracle. Probe one mutant with --only and a --suites module whose
// generator builds the shape it needs.
//
// --only keeps the mutants whose "<catalog>: <name>" matches the regex; a
// pattern that matches none fails the run.
//
// --all runs the catalogs in packages/cssnano/mutation/catalogs.js that the
// chosen check applies to. Survivors, unchanged mutants and mutants no run
// reaches fail the run unless --allow-unkilled is given; errors and timeouts
// always fail it.
import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  loadCatalogs,
  selectCatalogs,
  selectMutants,
} from './mutation-testing.js';
import * as oracleCheck from './oracle-check.js';
import * as testCheck from './test-check.js';

const { values } = parseArgs({
  options: {
    all: { type: 'boolean' },
    catalog: { type: 'string', multiple: true },
    check: { type: 'string', default: 'test' },
    suites: { type: 'string' },
    seeds: { type: 'string', default: '7,12648430' },
    count: { type: 'string', default: '300' },
    only: { type: 'string' },
    full: { type: 'boolean' },
    timeout: { type: 'string' },
    'allow-unkilled': { type: 'boolean' },
  },
});

const checks = { test: testCheck, oracle: oracleCheck };
const check = checks[values.check] ?? testCheck;
try {
  if (process.versions.node.split('.')[0] !== '24') {
    throw new Error('Mutation testing requires Node 24');
  }
  if (!Object.hasOwn(checks, values.check)) {
    throw new Error(`Unknown --check ${values.check}; use test or oracle`);
  }
  const sources = (values.catalog ?? []).map((path) => ({
    url: pathToFileURL(resolve(path)),
  }));
  if (values.all) {
    const { catalogs } =
      await import('../../packages/cssnano/mutation/catalogs.js');
    sources.push(...selectCatalogs(catalogs, values.check));
  }
  if (!sources.length) {
    throw new Error('Missing required argument --catalog or --all');
  }
  const loaded = selectMutants(
    await loadCatalogs(sources.map(({ url }) => url)),
    values.only
  );
  const total = loaded.reduce((n, { mutations }) => n + mutations.length, 0);
  console.log(
    `Running ${total} mutants of ${loaded.length} catalogs with --check ${values.check}`
  );
  await check.run(
    loaded.map((catalog, index) => ({
      ...catalog,
      suites: sources[index].suites,
    })),
    {
      ...values,
      allowUnkilled: values['allow-unkilled'] ?? false,
      timeout: Number(values.timeout ?? check.defaultTimeout),
    }
  );
} catch (error) {
  console.error(`${check.harnessError}: ${error.message}`);
  process.exitCode = 1;
}
