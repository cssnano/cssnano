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
const seed = Number(values.seed);
const rng = random(seed);
const old = postcss([oldPlugin()]);
const current = postcss([plugin()]);
let count = 0;

for (const css of [
  ...edgeCases,
  ...Array.from({ length: Number(values.count) }, () => randRule(rng)),
]) {
  count++;
  const options = { from: undefined };
  const oldOutput = old.process(css, options).css;
  const currentOutput = current.process(css, options).css;
  if (currentOutput !== oldOutput) {
    console.error(
      `DIVERGENCE\nseed: ${seed}\ninput: ${css}\nold: ${oldOutput}\nnew: ${currentOutput}`
    );
    process.exit(1);
  }
}
console.log(`${count} cases (seed ${seed}), clean`);
