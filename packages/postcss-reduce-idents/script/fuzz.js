import { parseFuzzArgs, runFuzz } from '../../../util/fuzzRunner.js';
import { check } from './lib/fuzzCheck.js';
import { generate, BRANCHES } from './lib/fuzzGenerate.js';

const { seed, count, interval } = parseFuzzArgs({ defaultCount: 10000 });

const cases = generate(seed, count);

// Require the generator's rotation to hit every grammar branch, or coverage
// silently shrinks.
const branches = new Set();
for (const { branch } of cases) {
  branches.add(branch);
  if (branches.size === BRANCHES.length) {
    break;
  }
}
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
  interval,
});
