import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { parseFuzzArgs, runFuzz } from './fuzzRunner.js';

/**
 * @param {string[]} args
 */
function parse(args) {
  return parseFuzzArgs({ args, exitOnError: false });
}

/**
 * Replaces process.exit with a throwing stub so the test keeps running.
 *
 * @param {import('node:test').TestContext} t
 */
function mockExit(t) {
  return t.mock.method(process, 'exit', (code) => {
    throw new Error(`process.exit(${code})`);
  });
}

describe('parseFuzzArgs', () => {
  test('defaults to seed 1, 10000 cases and a 10000-case progress interval', () => {
    assert.deepEqual(parse([]), { seed: 1, count: 10000, interval: 10000 });
  });

  test('uses the configured defaults when no options are given', () => {
    const result = parseFuzzArgs({
      defaultCount: 50000,
      defaultSeed: 7,
      defaultInterval: 5000,
      args: [],
      exitOnError: false,
    });
    assert.deepEqual(result, { seed: 7, count: 50000, interval: 5000 });
  });

  test('reads explicit seed, count and interval options', () => {
    assert.deepEqual(
      parse(['--seed', '42', '--count', '500', '--interval', '100']),
      { seed: 42, count: 500, interval: 100 }
    );
  });

  test('ignores the -- delimiter that package managers forward', () => {
    assert.deepEqual(parse(['--', '--seed', '123', '--count', '2500']), {
      seed: 123,
      count: 2500,
      interval: 10000,
    });
  });

  for (const seed of ['not-a-number', '', '   ', '1.5', '-1', '1e300']) {
    test(`rejects seed ${JSON.stringify(seed)}, which does not name one PRNG stream`, () => {
      assert.throws(() => parse([`--seed=${seed}`]), TypeError);
    });
  }

  for (const count of ['0', '-10', '12.5', 'invalid', '', '9007199254740992']) {
    test(`rejects count ${JSON.stringify(count)}`, () => {
      assert.throws(() => parse([`--count=${count}`]), TypeError);
    });
  }

  for (const interval of ['-1', '1.5', '']) {
    test(`rejects interval ${JSON.stringify(interval)}`, () => {
      assert.throws(() => parse([`--interval=${interval}`]), TypeError);
    });
  }

  test('names the unknown option in the error', () => {
    assert.throws(() => parse(['--unknown-option']), /--unknown-option/v);
  });

  test('exits with code 2 on an invalid value', (t) => {
    t.mock.method(console, 'error', () => {});
    const exit = mockExit(t);
    assert.throws(() => parseFuzzArgs({ args: ['--count', '0'] }));
    assert.deepEqual(exit.mock.calls[0].arguments, [2]);
  });

  test('exits with code 2 when an option is missing its value', (t) => {
    t.mock.method(console, 'error', () => {});
    const exit = mockExit(t);
    assert.throws(() => parseFuzzArgs({ args: ['--seed'] }));
    assert.deepEqual(exit.mock.calls[0].arguments, [2]);
  });

  test('prints usage to stderr before exiting', (t) => {
    const error = t.mock.method(console, 'error', () => {});
    mockExit(t);
    assert.throws(() => parseFuzzArgs({ args: ['--count', '0'] }));
    assert.match(error.mock.calls[0].arguments[0], /--count/v);
  });
});

describe('runFuzz', () => {
  test('logs progress at every interval', (t) => {
    const log = t.mock.method(console, 'log', () => {});
    runFuzz({ cases: [1, 2, 3, 4, 5], check: () => {}, count: 5, interval: 2 });
    assert.deepEqual(
      log.mock.calls.slice(0, 2).map((call) => call.arguments[0]),
      ['2/5', '4/5']
    );
  });

  test('summarizes a clean run with the seed and elapsed time', (t) => {
    const log = t.mock.method(console, 'log', () => {});
    runFuzz({ cases: [1, 2, 3], check: () => {}, count: 3, seed: 42 });
    assert.match(
      log.mock.calls.at(-1).arguments[0],
      /^3 cases, seed 42, clean in \d+\.\ds$/v
    );
  });

  test('summarizes the cases actually checked when the corpus runs short', (t) => {
    const log = t.mock.method(console, 'log', () => {});
    const result = runFuzz({ cases: [1, 2], check: () => {}, count: 5 });
    assert.equal(result.passed, 2);
    assert.match(log.mock.calls.at(-1).arguments[0], /^2 of 5 cases, clean/v);
  });

  test('passes the failure, seed and zero-based case index to report', (t) => {
    const error = t.mock.method(console, 'error', () => {});
    assert.throws(() =>
      runFuzz({
        cases: [1, 2, -1, 4],
        check: (item) => (item < 0 ? 'negative value' : undefined),
        report: (failure, seed, index) => `${failure} ${seed} ${index}`,
        count: 4,
        seed: 10,
        exitOnFailure: false,
      })
    );
    assert.equal(error.mock.calls[0].arguments[0], 'negative value 10 2');
  });

  test('throws on failure when exitOnFailure is false', (t) => {
    t.mock.method(console, 'error', () => {});
    assert.throws(
      () =>
        runFuzz({
          cases: [1, -1],
          check: (item) => (item < 0 ? 'negative' : undefined),
          count: 2,
          exitOnFailure: false,
        }),
      /Fuzzing failure after 2 cases/v
    );
  });

  test('exits with code 1 on failure by default', (t) => {
    t.mock.method(console, 'error', () => {});
    const exit = mockExit(t);
    assert.throws(() =>
      runFuzz({ cases: [1], check: () => 'failure', count: 1 })
    );
    assert.deepEqual(exit.mock.calls[0].arguments, [1]);
  });

  test('stringifies the failure when no report is given', (t) => {
    const error = t.mock.method(console, 'error', () => {});
    assert.throws(() =>
      runFuzz({
        cases: [10],
        check: () => 'simple failure reason',
        count: 1,
        exitOnFailure: false,
      })
    );
    assert.equal(error.mock.calls[0].arguments[0], 'simple failure reason');
  });

  test('does not generate cases beyond count', (t) => {
    t.mock.method(console, 'log', () => {});
    let generated = 0;
    const cases = (function* () {
      for (;;) {
        generated++;
        yield generated;
      }
    })();
    runFuzz({ cases, check: () => {}, count: 3, interval: 0 });
    assert.equal(generated, 3);
  });
});
