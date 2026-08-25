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
const run = (processor, css) =>
  processor.process(css, { from: undefined, overrideBrowserslist: 'Chrome 58' })
    .css;
const old = postcss([oldPlugin({ overrideBrowserslist: 'Chrome 58' })]);
const current = postcss([plugin({ overrideBrowserslist: 'Chrome 58' })]);
let count = 0;
for (const css of [
  ...edgeCases,
  ...Array.from({ length: Number(values.count) }, () => randRule(rng)),
]) {
  count++;
  const a = run(old, css);
  const b = run(current, css);
  if (a !== b) {
    console.error(
      `DIVERGENCE\nseed: ${seed}\ninput: ${css}\nold: ${a}\nnew: ${b}`
    );
    process.exit(1);
  }
}
console.log(`${count} cases (seed ${seed}), clean`);
