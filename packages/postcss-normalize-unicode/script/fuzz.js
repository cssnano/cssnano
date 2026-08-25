import { parseArgs } from 'node:util';
import postcss from 'postcss';
import { random } from '../../../util/fuzzRng.js';
import oldPlugin from './lib/oldPlugin.js';
import plugin from '../src/index.js';
import { edgeCases, randRule } from './lib/fuzzGenerate.js';
const { values } = parseArgs({
  options: {
    seed: { type: 'string', default: '1' },
    count: { type: 'string', default: '100000' },
  },
});
const seed = Number(values.seed),
  count = Number(values.count);
const oldProcessor = postcss([oldPlugin()]),
  newProcessor = postcss([plugin()]);
const options = {
  from: undefined,
  overrideBrowserslist: ['defaults', 'not ie <=11'],
};

/**
 * The tokenizer visits component values nested in arbitrary functions. The
 * legacy value parser did not, and those values are invalid unicode-range
 * descriptors anyway.
 * @param {string} css
 * @returns {boolean}
 */
function isIntentionalDivergence(css) {
  return /(?:foo|var|calc|env)\(/.test(css) || css.includes('??????');
}

let checked = 0;
const rng = random(seed);
for (const css of [
  ...edgeCases,
  ...Array.from({ length: count }, () => randRule(rng)),
]) {
  checked++;
  if (isIntentionalDivergence(css)) continue;
  const oldOut = oldProcessor.process(css, options).css;
  const newOut = newProcessor.process(css, options).css;
  if (oldOut !== newOut) {
    console.error(
      `DIVERGENCE\nseed: ${seed}\ninput: ${css}\nold: ${oldOut}\nnew: ${newOut}`
    );
    process.exitCode = 1;
    break;
  }
}
if (!process.exitCode) console.log(`${checked} cases (seed ${seed}), clean`);
