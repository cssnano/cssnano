import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  applyMutation,
  countTests,
  loadCatalogs,
  mapWithConcurrency,
  outcome,
  report,
  selectCatalogs,
  selectMutants,
  runNode,
} from './mutation-testing.js';

const { catalogs } =
  await import('../../packages/cssnano/mutation/catalogs.js');
const catalogPromises = catalogs.map(({ url }) => import(url.href));

test('applies a mutation exactly once', () => {
  const source = 'one; target; three;';
  assert.strictEqual(
    applyMutation(source, { find: 'target', replace: 'changed' }),
    'one; changed; three;'
  );
  assert.strictEqual(source, 'one; target; three;');
});

test('rejects an unmatched mutation', () => {
  assert.throws(
    () => applyMutation('one', { find: 'missing', replace: 'changed' }),
    /was not found/v
  );
});

test('rejects a mutation that matches more than once', () => {
  assert.throws(
    () =>
      applyMutation('target target', { find: 'target', replace: 'changed' }),
    /more than once/v
  );
});

test('returns mapped results in input order', async () => {
  const results = await mapWithConcurrency([3, 1, 2], 2, async (item) => {
    await new Promise((resolve) => {
      setTimeout(resolve, item);
    });
    return item * 10;
  });
  assert.deepStrictEqual(results, [30, 10, 20]);
});

test('never runs more workers at once than the concurrency limit', async () => {
  let inFlight = 0;
  let peak = 0;
  await mapWithConcurrency(Array.from({ length: 10 }), 3, async () => {
    inFlight += 1;
    peak = Math.max(peak, inFlight);
    await new Promise((resolve) => {
      setImmediate(resolve);
    });
    inFlight -= 1;
  });
  assert.strictEqual(peak, 3);
});

test('every catalog mutation matches its source once', async () => {
  for (const catalog of await Promise.all(catalogPromises)) {
    for (const mutation of catalog.mutations) {
      const target = fileURLToPath(mutation.target ?? catalog.target);
      const source = readFileSync(target, 'utf8');
      const mutated = applyMutation(source, mutation);
      assert.notStrictEqual(mutated, source, mutation.name);
      assert.strictEqual(readFileSync(target, 'utf8'), source);
    }
  }
});

test('the registry lists every catalog file in the mutation directory', () => {
  const root = new URL('../../packages/cssnano/mutation/', import.meta.url);
  const onDisk = readdirSync(root, { recursive: true })
    .filter((path) => /(?:^|\/)mutation-catalog[^\/]*\.js$/v.test(path))
    .map((path) => fileURLToPath(new URL(path, root)))
    .toSorted();
  assert.deepStrictEqual(
    catalogs.map(({ url }) => fileURLToPath(url)).toSorted(),
    onDisk
  );
});

test('every registered catalog is run by a test check, an oracle check or both', () => {
  for (const { url, test: tested, suites } of catalogs) {
    assert.ok(tested === true || suites instanceof URL, url.href);
  }
});

test('runNode kills a process that outlives its timeout, even one that ignores SIGTERM', async () => {
  const result = await runNode(
    ['--eval', "process.on('SIGTERM', () => {}); setInterval(() => {}, 1000);"],
    process.env,
    300
  );
  assert.strictEqual(result.timedOut, true);
  assert.strictEqual(result.signal, 'SIGKILL');
});

test('runNode returns the exit code and both output streams', async () => {
  const result = await runNode(
    ['--eval', "console.log('out'); console.error('err'); process.exit(3);"],
    process.env,
    10000
  );
  assert.deepStrictEqual(
    [result.code, result.stdout.trim(), result.stderr.trim(), result.timedOut],
    [3, 'out', 'err', false]
  );
});

test('loadCatalogs resolves each mutation target, preferring the mutation own', async () => {
  const [entry] = await loadCatalogs([
    new URL('./fixtures/catalog.js', import.meta.url),
  ]);
  assert.deepStrictEqual(
    entry.mutations.map(({ target }) => target),
    ['file:///catalog-target.js', 'file:///own-target.js']
  );
});

test('loadCatalogs prefixes the label with the catalog name', async () => {
  const [entry] = await loadCatalogs([
    new URL('./fixtures/catalog.js', import.meta.url),
  ]);
  assert.strictEqual(entry.label, 'fixture: ');
});

test('loadCatalogs rejects a catalog without a mutations array', async () => {
  await assert.rejects(
    loadCatalogs([
      new URL('./fixtures/catalog-without-mutations.js', import.meta.url),
    ]),
    /Catalog must export/v
  );
});

/**
 * @param {Array<object>} results
 * @param {{allowUnkilled?: boolean, suffix?: string}} [options]
 */
function reported(results, options = {}) {
  const out = [];
  const err = [];
  const failed = report(results, {
    allowUnkilled: false,
    ...options,
    out: (line) => out.push(line),
    err: (line) => err.push(line),
  });
  return { out, err, failed };
}

test('report prints the status first, then the mutation and its detail', () => {
  const { out } = reported([
    { name: 'a: change', status: outcome.killed, detail: 'first=1:0' },
    { name: 'a: other', status: outcome.killed },
  ]);
  assert.deepStrictEqual(out.slice(0, 2), [
    'killed: a: change | first=1:0',
    'killed: a: other',
  ]);
});

test('report summarizes only the statuses that occurred', () => {
  const { out } = reported(
    [
      { name: 'one', status: outcome.killed },
      { name: 'two', status: outcome.survived },
      { name: 'three', status: outcome.killed },
    ],
    { allowUnkilled: true, suffix: '; 1.0s' }
  );
  assert.strictEqual(out.at(-1), '3 mutants: 2 killed, 1 survived; 1.0s');
});

test('report prints the diagnostic of an errored mutant on stderr', () => {
  const { err } = reported([
    { name: 'one', status: outcome.errored, diagnostic: 'boom' },
  ]);
  assert.deepStrictEqual(err, ['one: boom']);
});

test('report prints no diagnostic for a killed mutant', () => {
  const { err } = reported([
    { name: 'one', status: outcome.killed, diagnostic: 'failing test output' },
  ]);
  assert.deepStrictEqual(err, []);
});

test('report fails on a survivor unless unkilled mutants are allowed', () => {
  const results = [{ name: 'one', status: outcome.survived }];
  assert.deepStrictEqual(
    [
      reported(results).failed,
      reported(results, { allowUnkilled: true }).failed,
    ],
    [true, false]
  );
});

test('report fails on a mutant no run reached unless unkilled mutants are allowed', () => {
  const results = [{ name: 'one', status: outcome.notReached }];
  assert.deepStrictEqual(
    [
      reported(results).failed,
      reported(results, { allowUnkilled: true }).failed,
    ],
    [true, false]
  );
});

test('report fails on a mutant that changed no output unless unkilled mutants are allowed', () => {
  const results = [{ name: 'one', status: outcome.unchanged }];
  assert.deepStrictEqual(
    [
      reported(results).failed,
      reported(results, { allowUnkilled: true }).failed,
    ],
    [true, false]
  );
});

test('report fails on an errored or timed-out mutant even when unkilled mutants are allowed', () => {
  for (const status of [outcome.errored, outcome.timedOut]) {
    assert.strictEqual(
      reported([{ name: 'one', status }], { allowUnkilled: true }).failed,
      true,
      status
    );
  }
});

test('selectCatalogs keeps the registry entries that the check runs', () => {
  const suites = new URL('file:///suites.js');
  const registry = [
    { url: new URL('file:///a.js'), test: true },
    { url: new URL('file:///b.js'), test: true, suites },
    { url: new URL('file:///c.js'), suites },
  ];
  assert.deepStrictEqual(
    [
      selectCatalogs(registry, 'test').map(({ url }) => url.pathname),
      selectCatalogs(registry, 'oracle').map(({ url }) => url.pathname),
    ],
    [
      ['/a.js', '/b.js'],
      ['/b.js', '/c.js'],
    ]
  );
});

const catalogOf = (...names) => ({
  label: 'c: ',
  mutations: names.map((name) => ({ mutation: { name }, target: 't' })),
});

test('selectMutants keeps the mutants whose labelled name matches the pattern', () => {
  const [kept] = selectMutants([catalogOf('alpha', 'beta')], 'c: be');
  assert.deepStrictEqual(
    kept.mutations.map(({ mutation }) => mutation.name),
    ['beta']
  );
});

test('selectMutants keeps every mutant without a pattern', () => {
  const [kept] = selectMutants([catalogOf('alpha', 'beta')]);
  assert.strictEqual(kept.mutations.length, 2);
});

test('selectMutants rejects a pattern that matches no mutant so that an empty run cannot pass', () => {
  assert.throws(
    () => selectMutants([catalogOf('alpha')], 'nomatch'),
    /No mutant matches --only nomatch/v
  );
});

test('selectMutants rejects catalogs that contain no mutant', () => {
  assert.throws(() => selectMutants([catalogOf()]), /No mutants to run/v);
});

test('report fails a run that judged no mutant', () => {
  const { failed, out } = reported([], { allowUnkilled: true });
  assert.deepStrictEqual([failed, out.at(-1)], [true, '0 mutants: ']);
});

test('countTests reads the number of tests the runner executed', () => {
  assert.deepStrictEqual(
    [
      countTests('✔ a (1ms)\nℹ tests 24\nℹ pass 24\n', 'a.test.js'),
      countTests('no summary', 'a.test.js'),
    ],
    [24, undefined]
  );
});

test('countTests does not count the placeholder the runner reports for a file without tests', () => {
  assert.strictEqual(
    countTests('✔ a.test.js (1ms)\nℹ tests 1\n', 'a.test.js'),
    0
  );
});
