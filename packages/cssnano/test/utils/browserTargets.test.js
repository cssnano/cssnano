import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import realBrowserslist from 'browserslist';
import {
  defaultTargetsQuery,
  resolveTargets,
} from '../../src/utils/browserTargets.js';

/**
 * @param {string | undefined} [config] what the project's browserslist config holds
 * @returns {{browserslist: ((query: unknown, opts: any) => string[]) & {loadConfig: (opts: any) => string | undefined}, calls: {query: unknown, opts: any}[], configLookups: any[]}}
 */
function recordingBrowserslist(config) {
  const calls = [];
  const configLookups = [];
  /** @param {unknown} query @param {any} opts */
  function resolve(query, opts) {
    calls.push({ query, opts });
    return ['chrome 150', 'firefox 152'];
  }
  resolve.loadConfig = (/** @type {any} */ opts) => {
    configLookups.push(opts);
    return config;
  };
  return { calls, configLookups, browserslist: resolve };
}

/**
 * @param {(query: unknown) => string[]} resolve
 * @return {any}
 */
function withoutConfig(resolve) {
  return Object.assign(resolve, { loadConfig: () => undefined });
}

/** @param {object} [opts] */
function resultWith(opts = {}) {
  return { opts, warn() {} };
}

describe('resolveTargets arguments', () => {
  test('passes the override query to browserslist unchanged', () => {
    const { browserslist, calls } = recordingBrowserslist();
    resolveTargets(
      { query: ['defaults', 'not ie <=11'] },
      resultWith(),
      browserslist
    );
    assert.deepEqual(calls[0].query, ['defaults', 'not ie <=11']);
  });

  test('uses the from option of the PostCSS result as the config search path', () => {
    const { browserslist, calls } = recordingBrowserslist();
    resolveTargets(
      { query: '> 1%' },
      resultWith({ from: '/from/a.css' }),
      browserslist
    );
    assert.equal(calls[0].opts.path, '/from/a.css');
  });

  test('looks up the project config with the preset env and the from path', () => {
    const { browserslist, configLookups } = recordingBrowserslist();
    resolveTargets(
      { env: 'legacy' },
      resultWith({ from: '/project/src/a.css' }),
      browserslist
    );
    assert.deepEqual(configLookups, [
      { path: '/project/src/a.css', env: 'legacy', config: undefined },
    ]);
  });

  test('does not take the env of the PostCSS result, which only browserslist.env sets', () => {
    const { browserslist, calls } = recordingBrowserslist();
    resolveTargets({}, resultWith({ env: 'modern' }), browserslist);
    assert.equal(calls[0].opts.env, undefined);
  });

  test('does not take the stats of the PostCSS result, which only browserslist.stats sets', () => {
    const { browserslist, calls } = recordingBrowserslist();
    const stats = { chrome: { 150: 1 } };
    resolveTargets({}, resultWith({ stats }), browserslist);
    assert.equal(calls[0].opts.stats, undefined);
  });

  test('searches the config upwards from the from file', () => {
    const { browserslist, calls } = recordingBrowserslist();
    resolveTargets(
      {},
      resultWith({ from: '/project/src/a.css', file: '/other/b.css' }),
      browserslist
    );
    assert.equal(calls[0].opts.path, '/project/src/a.css');
  });

  test('searches the config upwards from file when from is unset', () => {
    const { browserslist, calls } = recordingBrowserslist();
    resolveTargets(
      {},
      resultWith({ file: '/project/build/b.css' }),
      browserslist
    );
    assert.equal(calls[0].opts.path, '/project/build/b.css');
  });

  test('searches the config from the working directory, not a plugin directory, when from and file are unset', () => {
    const { browserslist, calls } = recordingBrowserslist();
    resolveTargets({}, resultWith(), browserslist);
    assert.equal(calls[0].opts.path, process.cwd());
  });

  test('resolves without a search path when the working directory was deleted', (t) => {
    t.mock.method(process, 'cwd', () => {
      throw Object.assign(new Error('uv_cwd'), { code: 'ENOENT' });
    });
    const { browserslist, calls } = recordingBrowserslist();
    resolveTargets({}, resultWith(), browserslist);
    assert.equal(calls[0].opts.path, undefined);
  });
});

describe('resolveTargets default targets', () => {
  test('resolves Baseline widely available with downstream browsers when there is no override and no project config', () => {
    const { browserslist, calls } = recordingBrowserslist();
    resolveTargets({}, resultWith(), browserslist);
    assert.equal(calls[0].query, 'baseline widely available with downstream');
  });

  test('resolves the project config query instead of the default when the project has one', () => {
    const { browserslist, calls } = recordingBrowserslist('ie 11');
    resolveTargets({}, resultWith(), browserslist);
    assert.equal(calls[0].query, 'ie 11');
  });

  test('does not look up the project config when the override sets a query', () => {
    const { browserslist, configLookups } = recordingBrowserslist('ie 11');
    resolveTargets({ query: 'chrome 120' }, resultWith(), browserslist);
    assert.equal(configLookups.length, 0);
  });

  test('resolves to the same browsers as the default query with real browserslist in a directory without config', () => {
    const directory = mkdtempSync(join(tmpdir(), 'cssnano-targets-'));
    try {
      writeFileSync(join(directory, 'package.json'), '{}');
      const previous = process.env.BROWSERSLIST;
      delete process.env.BROWSERSLIST;
      try {
        assert.deepEqual(
          [
            ...resolveTargets(
              {},
              resultWith({ from: join(directory, 'app.css') }),
              realBrowserslist
            ),
          ],
          realBrowserslist(defaultTargetsQuery)
        );
      } finally {
        if (previous !== undefined) process.env.BROWSERSLIST = previous;
      }
    } finally {
      rmSync(directory, { recursive: true });
    }
  });
});

describe('resolveTargets empty resolution', () => {
  const emptyBrowserslist = withoutConfig(() => []);
  const query = { query: 'not dead and not ie 11' };

  test('keeps the empty list, so no optimization that depends on support is enabled', () => {
    const targets = resolveTargets(query, resultWith(), emptyBrowserslist);
    assert.deepEqual([...targets], []);
  });

  test('does not query the default targets when the query matches no browser', () => {
    const calls = [];
    resolveTargets(
      query,
      resultWith(),
      withoutConfig((q) => {
        calls.push(q);
        return [];
      })
    );
    assert.deepEqual(calls, [query.query]);
  });

  test('does not warn when the query matches a browser', () => {
    const warnings = [];
    const { browserslist } = recordingBrowserslist();
    resolveTargets(
      query,
      { opts: {}, warn: (text) => warnings.push(text) },
      browserslist
    );
    assert.deepEqual(warnings, []);
  });

  test('resolves an empty query without a result, which has nowhere to warn', () => {
    assert.deepEqual(
      [...resolveTargets(query, undefined, emptyBrowserslist)],
      []
    );
  });
});

describe('resolveTargets repeated calls', () => {
  test('resolves again for each call without a result, which has no file to share with', () => {
    const { browserslist, calls } = recordingBrowserslist();
    const first = resolveTargets(
      { query: 'chrome 120' },
      undefined,
      browserslist
    );
    resolveTargets({ query: 'chrome 120' }, undefined, browserslist);
    assert.equal(calls.length, 2);
    assert.equal(first.length, 2);
  });

  test('does not cache a resolution that throws, so the next call resolves again', () => {
    let attempts = 0;
    const browserslist = withoutConfig(() => {
      attempts += 1;
      if (attempts === 1) throw new Error('Unknown version 150 of android');
      return ['chrome 150'];
    });
    const result = resultWith({ from: '/project/a.css' });
    assert.throws(
      () => resolveTargets({}, result, browserslist),
      /Unknown version/v
    );
    assert.deepEqual(
      [...resolveTargets({}, result, browserslist)],
      ['chrome 150']
    );
    assert.equal(attempts, 2);
  });
});

describe('resolveTargets result', () => {
  test('leaves the array that browserslist caches unfrozen, so other tools can still change theirs', () => {
    const query = 'chrome 120, firefox 115';
    resolveTargets({ query }, resultWith());
    assert.equal(Object.isFrozen(realBrowserslist(query)), false);
  });

  test('returns a frozen list, so a plugin cannot change the targets that other plugins share', () => {
    const { browserslist } = recordingBrowserslist();
    const targets = resolveTargets({}, resultWith(), browserslist);
    assert.equal(Object.isFrozen(targets), true);
  });

  test('keeps the resolved targets when another tool changes the array that browserslist returned', () => {
    const shared = ['chrome 150'];
    const browserslist = withoutConfig(() => shared);
    const targets = resolveTargets({}, resultWith(), browserslist);
    shared.push('ie 6');
    assert.deepEqual([...targets], ['chrome 150']);
  });

  test('returns one frozen list when browserslist returns a new array with the same entries for each result', () => {
    const browserslist = withoutConfig(() => ['chrome 150', 'firefox 140']);
    const first = resolveTargets({}, resultWith(), browserslist);
    const second = resolveTargets({}, resultWith(), browserslist);
    assert.equal(first, second);
  });

  test('returns one frozen list for every result that resolves the same browserslist list', () => {
    const shared = ['chrome 150'];
    const browserslist = withoutConfig(() => shared);
    const first = resolveTargets({}, resultWith(), browserslist);
    const second = resolveTargets({}, resultWith(), browserslist);
    assert.equal(first, second);
  });
});

describe('resolveTargets warnings', () => {
  test('attributes the empty-query warning to the cssnano plugin, because no plugin has run yet', () => {
    const warnings = [];
    const result = {
      opts: {},
      warn: (text, options) => warnings.push({ text, options }),
    };
    resolveTargets(
      { query: 'not dead and not ie 11' },
      result,
      withoutConfig(() => [])
    );
    assert.equal(warnings[0].options.plugin, 'cssnano');
  });
});
