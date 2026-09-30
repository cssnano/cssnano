import { parseFuzzArgs, runFuzz } from '../../../util/fuzzRunner.js';
import { check, report } from './lib/fuzzCheck.js';
import { generate, BRANCHES } from './lib/fuzzGenerate.js';

const { seed, count, interval } = parseFuzzArgs({ defaultCount: 50000 });

const cases = generate(seed, count);

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
  report,
  count,
  seed,
  interval,
});
