#!/usr/bin/env node
'use strict';
const { parseArgs } = require('node:util');
const { generate } = require('./lib/fuzzGenerate.js');
const { checkMinimised, report } = require('./lib/fuzzCheck.js');

const { values } = parseArgs({
  options: {
    seed: { type: 'string', default: '1' },
    count: { type: 'string', default: '10000' },
  },
});

const seed = Number(values.seed);
const count = Number(values.count);

if (!Number.isInteger(seed) || !Number.isInteger(count)) {
  console.error('--seed and --count must be integers');
  process.exit(1);
}

const started = Date.now();
let passed = 0;
let failed = 0;

const corpus = generate(seed, count);

console.log(`Fuzzing with seed ${seed}, ${count} cases...`);

for (let i = 0; i < corpus.length; i++) {
  if (i % 10000 === 0 && i > 0) {
    console.log(`  ${i}/${count} cases checked...`);
  }

  const { rule, tree } = corpus[i];
  const { failure, seed: failSeed } = checkMinimised(rule, tree, seed);

  if (failure) {
    failed++;
    console.error('');
    console.error('FAILURE FOUND:');
    console.error(report(failure, failSeed));
    process.exit(1);
  }

  passed++;
}

console.log(
  `✓ All ${passed} cases passed in ${((Date.now() - started) / 1000).toFixed(1)}s`
);
process.exit(0);
