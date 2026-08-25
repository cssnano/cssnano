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
const processors = new Map();
function processorPair(opts) {
  const key = JSON.stringify(opts);
  if (!processors.has(key)) {
    processors.set(key, {
      current: postcss([plugin(opts)]),
      old: postcss([oldPlugin(opts)]),
    });
  }
  return processors.get(key);
}
let count = 0;
for (const { css, options: opts = {} } of [
  ...edgeCases.map((edgeCase) => ({ css: edgeCase })),
  ...Array.from({ length: Number(values.count) }, (_, index) =>
    randRule(rng, index)
  ),
]) {
  count++;
  if (intentionalDifferences.has(css)) continue;
  const options = { from: undefined };
  const { current, old } = processorPair(opts);
  const legacy = old.process(css, options).css;
  const modern = current.process(css, options).css;
  if (legacy !== modern) {
    console.error(
      `DIVERGENCE (unclassified)\nseed: ${seed}\ninput: ${css}\nlegacy: ${legacy}\ncurrent: ${modern}`
    );
    process.exit(1);
  }
}
console.log(`${count} cases (seed ${seed}), clean`);
