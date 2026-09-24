import { parseArgs } from 'node:util';
import { runFuzz } from '../../../util/fuzzRunner.js';
import { check } from './lib/fuzzCheck.js';
import { generate, BRANCHES } from './lib/fuzzGenerate.js';

const { values } = parseArgs({
  options: {
    seed: { type: 'string', default: '1' },
    count: { type: 'string', default: '10000' },
  },
});

const seed = Number(values.seed);
const count = Number(values.count);

if (!Number.isFinite(seed) || !Number.isFinite(count) || count < 1) {
  console.error('--seed and --count take numbers, and --count at least 1');
  process.exit(2);
}

const cases = generate(seed, count);

// Require the generator's rotation to hit every grammar branch, or coverage
// silently shrinks.
const branches = new Set(cases.map((testCase) => testCase.branch));
const missing = BRANCHES.filter((branch) => !branches.has(branch));
if (missing.length > 0) {
  console.error(`corpus is missing grammar branches: ${missing.join(', ')}`);
  process.exit(2);
}

runFuzz({
  cases,
  check,
  report: (failure, runSeed, index) =>
    [
      `fuzz failure (${failure.type}) after ${index} cases, seed ${runSeed}`,
      `input:  ${JSON.stringify(failure.value)}`,
      failure.output !== undefined
        ? `output: ${JSON.stringify(failure.output)}`
        : undefined,
      failure.message,
    ]
      .filter(Boolean)
      .join('\n'),
  count,
  seed,
});
