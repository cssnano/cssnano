import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  minimise,
  report,
  runPlugin,
  shrinkList,
  threwMismatch,
} from './fuzzCheck.js';

describe('shrinkList', () => {
  test('drops every item the failure does not need', () => {
    assert.deepEqual(
      shrinkList(['a', 'b', 'c'], (items) => items.includes('b')),
      ['b']
    );
  });

  test('keeps all items when each one is needed', () => {
    assert.deepEqual(
      shrinkList(
        ['a', 'b'],
        (items) => items.includes('a') && items.includes('b')
      ),
      ['a', 'b']
    );
  });

  test('never returns an empty list, even when an empty candidate would fail', () => {
    assert.deepEqual(
      shrinkList(['a', 'b'], () => true),
      ['a']
    );
  });

  test('does not test more than one candidate per item', () => {
    let calls = 0;
    shrinkList(['a', 'b', 'c', 'd'], () => {
      calls++;
      return false;
    });
    assert.equal(calls, 4);
  });
});

describe('runPlugin', () => {
  test('returns the css the processor produced', () => {
    const processor = {
      process: (/** @type {string} */ css) => ({ css: css.toUpperCase() }),
    };
    assert.equal(runPlugin(processor, 'a{}'), 'A{}');
  });
});

describe('threwMismatch', () => {
  test('carries the error message as the output', () => {
    assert.deepEqual(threwMismatch('a{}', new Error('boom')), {
      input: 'a{}',
      output: 'boom',
      reason: 'the plugin threw',
    });
  });

  test('stringifies a thrown value that is not an error', () => {
    assert.equal(threwMismatch('a{}', 'oops').output, 'oops');
  });
});

describe('minimise', () => {
  test('returns undefined when the case passes', () => {
    assert.equal(
      minimise(
        'a{}',
        () => undefined,
        (css) => css
      ),
      undefined
    );
  });

  test('returns the check result of the shrunk case', () => {
    const result = minimise(
      'xyz',
      (css) => (css.includes('x') ? threwMismatch(css, 'x') : undefined),
      (css, fails) => (fails('x') ? 'x' : css)
    );
    assert.equal(result?.input, 'x');
  });
});

describe('report', () => {
  test('lists the seed, the case and each differing slot', () => {
    assert.equal(
      report(
        {
          input: 'a{}',
          output: 'b{}',
          reason: 'changed',
          slots: [{ slot: 'top', expected: '1', actual: '2' }],
        },
        7
      ),
      [
        'seed 7: changed',
        '  in:  a{}',
        '  out: b{}',
        '  top: expected 1, got 2',
      ].join('\n')
    );
  });

  test('omits slot lines for a failure without slots', () => {
    assert.equal(
      report({ input: 'a', output: 'b', reason: 'r' }, 1).split('\n').length,
      3
    );
  });
});
