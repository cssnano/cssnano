// Compare merge-base and branch runs with the same Node version:
//   git worktree add /tmp/cssnano-merge-base "$(git merge-base HEAD origin/main)"
//   pnpm --dir /tmp/cssnano-merge-base --filter postcss-ordered-values bench
//   pnpm --filter postcss-ordered-values bench
// This is evidence only; it deliberately has no timing assertions or CI gate.
import { performance } from 'node:perf_hooks';
import postcss from 'postcss';
import plugin from '../src/index.js';
import { properties } from './lib/fuzzGenerate.js';

const warmup = 100;
const iterations = 100;
const batches = 9;
const repeated = `a{${properties.map(([property, values]) => `${property}:${values[0]}`).join(';')}}`;
const varied = `a{${properties.map(([property, values], index) => `${property}:${values[index % values.length]}`).join(';')}}`;

function measure(input) {
  const processor = postcss([plugin()]);
  for (let index = 0; index < warmup; index++)
    void processor.process(input, { from: undefined }).css;
  const times = [];
  for (let batch = 0; batch < batches; batch++) {
    const start = performance.now();
    for (let index = 0; index < iterations; index++)
      void processor.process(input, { from: undefined }).css;
    times.push(performance.now() - start);
  }
  const median = times.toSorted((a, b) => a - b)[Math.floor(times.length / 2)];
  return { median, throughput: (input.length * iterations) / (median / 1000) };
}

console.log(
  `Node ${process.version}; ${process.platform}/${process.arch}; input sizes repeated=${repeated.length}, varied=${varied.length}`
);
for (const [name, input] of [
  ['repeated values (cache-hit path)', repeated],
  ['varied values (parse/reduce path)', varied],
]) {
  const result = measure(input);
  console.log(
    `${name}: median ${result.median.toFixed(2)} ms; throughput ${result.throughput.toFixed(0)} bytes/s`
  );
}
