import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  browserTargets,
  resolveTargets,
} from '../../src/utils/browserTargets.js';

/**
 * A browserslist stand-in that records each call and config lookup.
 * @returns {any}
 */
function recordingBrowserslist() {
  const calls = [];
  const configLookups = [];
  /** @param {unknown} query @param {any} opts */
  function resolve(query, opts) {
    calls.push({ query, opts });
    return ['chrome 150'];
  }
  resolve.loadConfig = (/** @type {any} */ opts) => {
    configLookups.push(opts);
    return undefined;
  };
  return { calls, configLookups, browserslist: resolve };
}

/** @param {object} [opts] */
function resultWith(opts = {}) {
  return { opts, warn() {} };
}

describe('resolveTargets browserslist options', () => {
  test('forwards the config and the browserslist flags to browserslist', () => {
    const { browserslist, calls } = recordingBrowserslist();
    resolveTargets(
      {
        [browserTargets]: {
          query: 'defaults',
          config: './browsers.rc',
          ignoreUnknownVersions: true,
          mobileToDesktop: true,
          throwOnMissing: false,
        },
      },
      resultWith(),
      browserslist
    );
    assert.equal(calls[0].opts.config, './browsers.rc');
    assert.equal(calls[0].opts.ignoreUnknownVersions, true);
    assert.equal(calls[0].opts.mobileToDesktop, true);
    assert.equal(calls[0].opts.throwOnMissing, false);
  });

  test('reads the project config named by the config option, not the one found from from', () => {
    const { browserslist, configLookups } = recordingBrowserslist();
    resolveTargets(
      { [browserTargets]: { config: './browsers.rc' } },
      resultWith({ from: '/project/a.css' }),
      browserslist
    );
    assert.equal(configLookups[0].config, './browsers.rc');
  });

  test('searches the config from the browserslist path over the from path', () => {
    const { browserslist, calls } = recordingBrowserslist();
    resolveTargets(
      { [browserTargets]: { path: '/shared/config' } },
      resultWith({ from: '/project/a.css' }),
      browserslist
    );
    assert.equal(calls[0].opts.path, '/shared/config');
  });

  test('resolves separately for browserslist options that differ, even on one result', () => {
    const { browserslist, calls } = recordingBrowserslist();
    const result = resultWith();
    resolveTargets(
      { [browserTargets]: { query: 'defaults', mobileToDesktop: true } },
      result,
      browserslist
    );
    resolveTargets(
      { [browserTargets]: { query: 'defaults', mobileToDesktop: false } },
      result,
      browserslist
    );
    assert.equal(calls.length, 2);
  });
});
