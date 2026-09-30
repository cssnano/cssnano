#!/usr/bin/env node
import { parseFuzzArgs, runFuzz } from '../../../util/fuzzRunner.js';
import { checkMinimised, report } from './lib/fuzzCheck.js';
import { generate } from './lib/fuzzGenerate.js';

const { seed, count, interval } = parseFuzzArgs({ defaultCount: 10000 });

runFuzz({
  cases: generate(seed, count),
  check: ({ rule, tree }) => checkMinimised(rule, tree),
  report,
  count,
  seed,
  interval,
});
