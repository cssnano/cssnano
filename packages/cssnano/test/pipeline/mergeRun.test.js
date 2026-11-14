import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import defaultPreset from '#presets/default';
import { runDriver } from '../../src/passes/ir/runDriver.js';
import { LonghandRound } from '../../src/passes/merge/lib/longhand/canonicalize.js';

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

/**
 * Runs `css` through the default preset and returns the order of the build,
 * the two walks over the records and the end. Each walk is a round's root
 * call: the first round's is the walk down's, the second round's the walk up's.
 *
 * @param {string} css
 * @return {Promise<string[]>}
 */
async function orderOfRun(css) {
  const build = runDriver.build;
  const end = runDriver.end;
  const root = LonghandRound.prototype.root;
  /** @type {string[]} */
  const events = [];
  runDriver.build = (...args) => {
    events.push('build');
    return build(...args);
  };
  runDriver.end = (...args) => {
    events.push('end');
    return end(...args);
  };
  LonghandRound.prototype.root = function (records) {
    events.push(this.secondRound ? 'walk up' : 'walk down');
    return root.call(this, records);
  };
  try {
    await postcss(defaultPreset({})).process(css, { from: undefined });
    return events;
  } finally {
    runDriver.build = build;
    runDriver.end = end;
    LonghandRound.prototype.root = root;
  }
}

describe('the host run of the merge transforms', () => {
  test('the host builds once and writes once per stylesheet', async () => {
    const { builds, ends } = await runCounted('a{color:red}b{color:red}');
    assert.equal(builds, 1);
    assert.equal(ends, 1);
  });

  test('the host run walks the records twice between the build and the write', async () => {
    assert.deepEqual(await orderOfRun('a{color:red}b{color:red}'), [
      'build',
      'walk down',
      'walk up',
      'end',
    ]);
  });

  test('a run with a transform after merge builds the records once', async () => {
    const { builds, ends } = await runCounted('a{color:red}', {
      disable: ['merge'],
    });
    assert.equal(builds, 1);
    assert.equal(ends, 1);
  });
});
