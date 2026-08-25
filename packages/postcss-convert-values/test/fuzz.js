import nodetest from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import { random } from '../../../util/fuzzRng.js';
import oldPlugin from '../script/lib/oldPlugin.js';
import { randKeyframeRule, randRule } from '../script/lib/fuzzGenerate.js';
import plugin from '../src/index.js';

const { test } = nodetest;

/**
 * A short differential sweep: random CSS declarations, each compared
 * byte-for-byte against the old postcss-value-parser plugin. The
 * failures this finds are conversion or clamping divergences that
 * hand-written tests are worst at catching.
 *
 * `script/fuzz.js --seed N --count 100000` runs the same generator
 * for as long as you like after changing a conversion path.
 */

const oldProcessor = postcss([oldPlugin()]);
const newProcessor = postcss([plugin()]);

/**
 * @param {string} css
 * @return {{old: string, new: string}}
 */
function processWith(css) {
  return {
    old: oldProcessor.process(css, { from: undefined }).css,
    new: newProcessor.process(css, { from: undefined }).css,
  };
}

const casesPerSeed = 2000;

for (const seed of [1, 2, 3]) {
  test(`preserves output, differential seed ${seed}`, () => {
    const rng = random(seed);

    for (let i = 0; i < casesPerSeed; i++) {
      const css = rng.chance(0.1) ? randKeyframeRule(rng) : randRule(rng);
      const { old: oldOut, new: newOut } = processWith(css);

      assert.equal(
        newOut,
        oldOut,
        `seed ${seed}, input: ${css}\n  old: ${oldOut}\n  new: ${newOut}`
      );
    }
  });
}
