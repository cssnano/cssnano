import { parseArgs } from 'node:util';
import postcss from 'postcss';
import plugin from '../src/index.js';
import { edgeCases, generate } from './lib/fuzzGenerate.js';

const { values } = parseArgs({
  args: process.argv.slice(2).filter((argument) => argument !== '--'),
  options: {
    seed: { type: 'string', default: '1' },
    count: { type: 'string', default: '10000' },
  },
});
const seed = Number(values.seed);
const count = Number(values.count);
if (!Number.isFinite(seed) || !Number.isInteger(count) || count < 1) {
  console.error('--seed and --count take numbers, and --count at least 1');
  process.exit(2);
}

const processor = postcss([plugin()]);
let index = 0;
for (const sample of [...edgeCases, ...generate(seed, count)]) {
  try {
    const output = processor.process(sample.css, { from: undefined }).css;
    const second = postcss([plugin()]).process(output, { from: undefined }).css;
    if (output !== second) throw new Error('idempotence');
  } catch (error) {
    console.error(
      `seed: ${seed}\ncase: ${index}\nbranch: ${sample.branch}\ninput: ${sample.css}\ninvariant: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
  index++;
}
console.log(`${edgeCases.length + count} cases, seed ${seed}, clean`);
