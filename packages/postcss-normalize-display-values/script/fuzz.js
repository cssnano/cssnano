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
const old = postcss([oldPlugin()]),
  current = postcss([plugin()]);
let n = 0;
for (const css of [
  ...edgeCases,
  ...Array.from({ length: Number(values.count) }, () => randRule(rng)),
]) {
  n++;
  const a = old.process(css, { from: undefined }).css,
    b = current.process(css, { from: undefined }).css;
  if (a !== b) {
    console.error(
      `DIVERGENCE\nseed: ${seed}\ninput: ${css}\nold: ${a}\nnew: ${b}`
    );
    process.exit(1);
  }
}
console.log(`${n} cases (seed ${seed}), clean`);
