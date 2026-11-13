import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import defaultPreset from '#presets/default';
import { runDriver } from '../../src/passes/ir/runDriver.js';

/**
 * Runs `css` through the default preset with `options`, counting the builds and
 * the ends of the run driver, which the host calls once per stylesheet.
 *
 * @param {string} css
 * @param {Record<string, unknown>} [options]
 * @return {Promise<{builds: number, ends: number, result: import('postcss').Result}>}
 */
async function runCounted(css, options) {
  const build = runDriver.build;
  const end = runDriver.end;
  let builds = 0;
  let ends = 0;
  runDriver.build = (...args) => {
    builds++;
    return build(...args);
  };
  runDriver.end = (...args) => {
    ends++;
    return end(...args);
  };
  try {
    const result = await postcss(defaultPreset(options ?? {})).process(css, {
      from: undefined,
    });
    return { builds, ends, result };
  } finally {
    runDriver.build = build;
    runDriver.end = end;
  }
}

describe('the host run of the merge transforms', () => {
  test('the host builds once and writes once per stylesheet', async () => {
    const { builds, ends } = await runCounted('a{color:red}b{color:red}');
    assert.equal(builds, 1);
    assert.equal(ends, 1);
  });

  test('a run with merge off builds no records', async () => {
    const { builds, ends } = await runCounted('a{color:red}', {
      disable: ['merge'],
    });
    assert.equal(builds, 0);
    assert.equal(ends, 0);
  });
});
