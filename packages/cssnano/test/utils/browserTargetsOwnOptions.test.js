import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  defaultTargetsQuery,
  resolveTargets,
} from '../../src/utils/browserTargets.js';

/**
 * A browserslist stand-in that records each query and config lookup.
 * @returns {any}
 */
function recordingBrowserslist() {
  const calls = [];
  /** @param {unknown} query @param {any} opts */
  const resolve = (query, opts) => {
    calls.push({ query, opts });
    return ['chrome 150'];
  };
  resolve.loadConfig = () => undefined;
  return { browserslist: resolve, calls };
}

describe('resolveTargets for a plugin that runs alone', () => {
  test('uses the default targets query when neither a preset nor a config gives one', () => {
    const { browserslist, calls } = recordingBrowserslist();
    resolveTargets({}, { opts: {}, warn() {} }, browserslist);
    assert.equal(calls[0].query, defaultTargetsQuery);
  });
});
