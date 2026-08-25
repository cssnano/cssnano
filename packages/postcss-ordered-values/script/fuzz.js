import { parseArgs } from 'node:util';
import postcss from 'postcss';
import { random } from '../../../util/fuzzRng.js';
import oldPlugin from './lib/oldPlugin.js';
import plugin from '../src/index.js';
import {
  edgeCases,
  intentionalDifferences,
  randRule,
} from './lib/fuzzGenerate.js';

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

const cases = [
  ...edgeCases.map((css) => ({ branch: 'fixed', css })),
  ...Array.from({ length: Number(values.count) }, (_, index) =>
    randRule(rng, index)
  ),
];

for (const [index, sample] of cases.entries()) {
  count++;
  const { branch, css } = sample;
  if (intentionalDifferences.has(css)) continue;
  const options = { from: undefined };
  const oldOutput = old.process(css, options).css;
  const currentOutput = current.process(css, options).css;
  if (currentOutput !== oldOutput) {
    let firstDifferingByte = 0;
    while (
      firstDifferingByte < oldOutput.length &&
      oldOutput[firstDifferingByte] === currentOutput[firstDifferingByte]
    ) {
      firstDifferingByte++;
    }
    console.error(
      `DIVERGENCE\nclassification: unclassified\nseed: ${seed}\ncase: ${index}\nbranch: ${branch}\ninput: ${css}\nold: ${oldOutput}\nnew: ${currentOutput}\nfirst differing byte: ${firstDifferingByte}`
    );
    process.exit(1);
  }
}
console.log(`${count} cases (seed ${seed}), clean`);
