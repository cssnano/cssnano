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
  rng = random(seed);
let count = 0;
for (const css of [
  ...edgeCases,
  ...Array.from({ length: Number(values.count) }, () => randRule(rng)),
]) {
  count++;
  const a = postcss([oldPlugin()]).process(css, { from: undefined }).css;
  const b = postcss([plugin()]).process(css, { from: undefined }).css;
  if (a !== b) {
    console.error(
      `DIVERGENCE\nseed: ${seed}\ninput: ${css}\nold: ${a}\nnew: ${b}`
    );
    process.exit(1);
  }
}
console.log(`${count} cases (seed ${seed}), clean`);
