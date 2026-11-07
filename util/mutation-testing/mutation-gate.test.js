import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  compareToBaseline,
  doneLine,
  findStale,
  outcome,
  report,
} from './mutation-testing.js';

const { catalogs, groups } =
  await import('../../packages/cssnano/mutation/catalogs.js');

test('findStale names a mutation whose fragment is missing, and says why', async () => {
  const [stale] = await findStale([
    {
      label: 'c: ',
      mutations: [
        {
          mutation: { name: 'gone', find: 'no such text here', replace: 'x' },
          target: new URL('./mutation-testing.js', import.meta.url).href,
        },
      ],
    },
  ]);
  assert.deepStrictEqual(
    [stale.name, /was not found/v.test(stale.detail)],
    ['c: gone', true]
  );
});

test('findStale names a mutation whose fragment matches more than once', async () => {
  const [stale] = await findStale([
    {
      label: '',
      mutations: [
        {
          mutation: { name: 'twice', find: 'import', replace: 'x' },
          target: new URL('./mutation-testing.js', import.meta.url).href,
        },
      ],
    },
  ]);
  assert.match(stale.detail, /more than once/v);
});

test('findStale reports nothing for mutations that apply', async () => {
  const stale = await findStale([
    {
      label: '',
      mutations: [
        {
          mutation: { name: 'ok', find: 'export const outcome', replace: 'x' },
          target: new URL('./mutation-testing.js', import.meta.url).href,
        },
      ],
    },
  ]);
  assert.deepStrictEqual(stale, []);
});

test('report fails on a stale mutant even when unkilled mutants are allowed', () => {
  assert.strictEqual(
    report([{ name: 'one', status: outcome.stale }], {
      allowUnkilled: true,
      out() {},
      err() {},
    }),
    true
  );
});

test('compareToBaseline flags a mutant the baseline killed and the run did not', () => {
  const regressions = compareToBaseline(
    [
      { name: 'a', status: outcome.killed },
      { name: 'b', status: outcome.killed },
      { name: 'c', status: outcome.survived },
    ],
    [
      { name: 'a', status: outcome.killed },
      { name: 'b', status: outcome.survived },
      { name: 'c', status: outcome.killed },
    ]
  );
  assert.deepStrictEqual(regressions, [
    { name: 'b', before: 'killed', now: 'survived', regression: true },
    { name: 'c', before: 'survived', now: 'killed', regression: false },
  ]);
});

test('compareToBaseline ignores mutants that only one side judged', () => {
  assert.deepStrictEqual(
    compareToBaseline(
      [{ name: 'gone', status: outcome.killed }],
      [{ name: 'new', status: outcome.survived }]
    ),
    []
  );
});

test('doneLine puts every status count and the results path on one line', () => {
  const line = doneLine({
    failed: true,
    total: 3,
    results: [
      { name: 'a', status: outcome.killed },
      { name: 'b', status: outcome.killed },
      { name: 'c', status: outcome.timedOut },
    ],
    regressions: 0,
    path: '/r.json',
  });
  assert.strictEqual(
    line,
    'mutation: done status=fail mutants=3 killed=2 survived=0 unchanged=0 not-reached=0 errored=0 timed-out=1 stale=0 regressions=0 results=/r.json'
  );
});

test('every group runs registered catalogs with a check that applies to them', () => {
  const registered = new Map(catalogs.map((entry) => [entry.url.href, entry]));
  for (const [name, runs] of Object.entries(groups)) {
    assert.ok(runs.length > 0, name);
    for (const { check, catalogs: urls } of runs) {
      for (const url of urls) {
        const entry = registered.get(url.href);
        assert.ok(entry, `${name}: ${url.href}`);
        assert.ok(
          check === 'test' ? entry.test === true : entry.suites !== undefined,
          `${name}: ${url.href}`
        );
      }
    }
  }
});

test('the merge group holds the three runs of the merge gate', () => {
  assert.deepStrictEqual(Object.keys(groups).toSorted(), [
    'merge',
    'merge-duplicates',
    'merge-rules',
    'merge-selector-writers',
  ]);
});
