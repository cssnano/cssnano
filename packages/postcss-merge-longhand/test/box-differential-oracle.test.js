import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import plugin from '../src/index.js';
import { boxTargets } from '../script/lib/fuzzBoxCheck.js';
import { computedValues } from '../script/lib/fuzzBoxOracle.js';
import { generateBoxRules } from '../script/lib/fuzzBoxGenerate.js';

/**
 * The plugin may rewrite box declarations only if every physical side keeps
 * computing to the same value under every `writing-mode` and `direction`,
 * because a minifier cannot know either. This compares the cascade before and
 * after for random rules, under targets with and without the newer shorthands,
 * as read by each engine of the oracle that the target amounts to.
 */

const seeds = 40;
const casesPerSeed = 25;

/**
 * @param {string} css
 * @param {string[]} overrideBrowserslist
 * @return {Promise<string>}
 */
async function minify(css, overrideBrowserslist) {
  const result = await postcss([plugin({ overrideBrowserslist })]).process(
    css,
    { from: undefined }
  );
  return result.css;
}

describe('box cascade differential oracle', () => {
  for (const [index, { browsers, engines }] of boxTargets.entries()) {
    test(`keeps every physical side's computed value in every writing mode for ${browsers.join(', ')}`, async () => {
      for (let seed = 1; seed <= seeds; seed++) {
        for (const css of generateBoxRules(seed * 1000 + index, casesPerSeed)) {
          const output = await minify(css, browsers);
          for (const engine of engines) {
            assert.deepEqual(
              computedValues(output, engine),
              computedValues(css, engine),
              `${engine}: ${css}\n=> ${output}`
            );
          }
        }
      }
    });
  }

  test('never makes the output longer than the input', async () => {
    for (const css of generateBoxRules(7, 500)) {
      const output = await minify(css, ['chrome 120']);
      assert.ok(output.length <= css.length, `${css}\n=> ${output}`);
    }
  });
});
