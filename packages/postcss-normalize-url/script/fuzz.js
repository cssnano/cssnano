import { parseArgs } from 'node:util';
import { runFuzz } from '../../../util/fuzzRunner.js';
import { check, report } from './lib/fuzzCheck.js';
import { generate, BRANCHES } from './lib/fuzzGenerate.js';

const { values } = parseArgs({
  options: {
    seed: { type: 'string', default: '1' },
    count: { type: 'string', default: '50000' },
  },
});

const seed = Number(values.seed);
const count = Number(values.count);

if (!Number.isFinite(seed) || !Number.isFinite(count) || count < 1) {
  console.error('--seed and --count take numbers, and --count at least 1');
  process.exit(2);
}

const cases = generate(seed, count);

const branches = new Set(cases.map((testCase) => testCase.branch));
const missing = BRANCHES.filter((branch) => !branches.has(branch));
if (missing.length > 0) {
  console.error(`corpus is missing grammar branches: ${missing.join(', ')}`);
  process.exit(2);
}

runFuzz({
  cases,
  check,
  report,
  count,
  seed,
});
