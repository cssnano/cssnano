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
 * the two walks over the records and the end. The first pass runs in the walk
 * down, the second in the walk up; each walk calls its pass once per block, so
 * a phase is recorded once, when it starts.
 *
 * @param {string} css
 * @return {Promise<string[]>}
 */
async function orderOfRun(css) {
  const build = runDriver.build;
  const end = runDriver.end;
  const first = LonghandRound.prototype.first;
  const second = LonghandRound.prototype.second;
  /** @type {string[]} */
  const events = [];
  /** @param {string} phase */
  const record = (phase) => {
    if (events.at(-1) !== phase) events.push(phase);
  };
  runDriver.build = (...args) => {
    events.push('build');
    return build(...args);
  };
  runDriver.end = (...args) => {
    events.push('end');
    return end(...args);
  };
  LonghandRound.prototype.first = function (records, index) {
    record('walk down');
    return first.call(this, records, index);
  };
  LonghandRound.prototype.second = function (records, index) {
    record('walk up');
    return second.call(this, records, index);
  };
  try {
    await postcss(defaultPreset({})).process(css, { from: undefined });
    return events;
  } finally {
    runDriver.build = build;
    runDriver.end = end;
    LonghandRound.prototype.first = first;
    LonghandRound.prototype.second = second;
  }
}

describe('the host run of the merge transforms', () => {
  test('the host builds once and writes once per stylesheet', async () => {
    const { builds, ends } = await runCounted('a{color:red}b{color:red}');
    assert.equal(builds, 1);
    assert.equal(ends, 1);
  });

  test('the host run gives the first longhand round to the walk down and the second to the walk up, between the build and the write', async () => {
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
