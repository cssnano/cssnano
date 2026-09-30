import postcss from 'postcss';
import { parseFuzzArgs, runFuzz } from '../../../util/fuzzRunner.js';
import plugin from '../src/index.js';
import { edgeCases, generate } from './lib/fuzzGenerate.js';

const { seed, count, interval } = parseFuzzArgs({ defaultCount: 10000 });

const processor = postcss([plugin()]);

runFuzz({
  cases: (function* () {
    yield* edgeCases;
    yield* generate(seed, count);
  })(),
  check: (sample) => {
    try {
      const output = processor.process(sample.css, { from: undefined }).css;
      const second = processor.process(output, {
        from: undefined,
      }).css;
      if (output !== second) {
        return { sample, message: 'idempotence' };
      }
    } catch (error) {
      return {
        sample,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  },
  report: (failure, runSeed, index) =>
    `seed: ${runSeed}\ncase: ${index}\nbranch: ${failure.sample.branch}\ninput: ${failure.sample.css}\ninvariant: ${failure.message}`,
  count: edgeCases.length + count,
  seed,
  interval,
});
