import { parseArgs } from 'node:util';
import { check, report } from './lib/fuzzCheck.js';
import { generate } from './lib/fuzzGenerate.js';

// Unit tests use two 240-case seeds. Use this deterministic soak when changing
// token boundaries or position grammar handling:
//   pnpm --filter postcss-normalize-positions fuzz -- --seed 7 --count 200000
const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    seed: { type: 'string', default: '1' },
    count: { type: 'string', default: '10000' },
  },
});
const seed = Number(values.seed);
const count = Number(values.count);
if (!Number.isInteger(seed) || !Number.isInteger(count) || count < 1)
  throw new Error('--seed and --count take numbers');
let index = 0;
for (const sample of generate(seed, count)) {
  const failure = check(sample.css, sample.branch);
  if (failure) {
    console.error(report(failure, seed, index));
    process.exit(1);
  }
  index++;
}
console.log(`${count} cases, seed ${seed}, clean`);
