import nodeutil from 'node:util';
import postcss from 'postcss';
import { random } from '../../../util/fuzzRng.js';
import oldPlugin from './lib/oldPlugin.js';
import {
  edgeCases,
  randKeyframeRule,
  randPropertyRule,
  randRule,
} from './lib/fuzzGenerate.js';
import plugin from '../src/index.js';

const { parseArgs } = nodeutil;

/**
 * Differential fuzzer: feeds the same random CSS to the old
 * postcss-value-parser plugin and the new @csstools plugin, comparing
 * output byte-for-byte. Catches conversion, unit-stripping, and
 * clamping divergences that hand-written tests miss.
 *
 *   node script/fuzz.js --seed 1 --count 100000
 *
 * `test/fuzz.js` runs a short seeded sweep of the same generator with
 * the rest of the suite.
 */

const { values } = parseArgs({
  options: {
    seed: { type: 'string', default: '1' },
    count: { type: 'string', default: '100000' },
  },
});

const seed = Number(values.seed);
const count = Number(values.count);

if (!Number.isFinite(seed) || !Number.isFinite(count) || count < 1) {
  console.error('--seed and --count take numbers, and --count at least 1');
  process.exit(2);
}

const oldProcessor = postcss([oldPlugin()]);
const newProcessor = postcss([plugin()]);

/**
 * @param {string} css
 * @return {{old: string, new: string}}
 */
function processWith(css) {
  return {
    old: oldProcessor.process(css, { from: undefined }).css,
    new: newProcessor.process(css, { from: undefined }).css,
  };
}

const started = Date.now();
let checked = 0;
let failures = 0;

function check(css, label) {
  checked++;
  try {
    const { old: oldOut, new: newOut } = processWith(css);
    if (oldOut !== newOut) {
      failures++;
      console.error(
        `[${label}] DIVERGENCE\n  in:   ${css}\n  old:  ${oldOut}\n  new:  ${newOut}`
      );
      if (failures >= 10) {
        console.error('Stopping early (10 failures)');
        process.exit(1);
      }
    }
  } catch (error) {
    failures++;
    console.error(`[${label}] ERROR: ${error.message}\n  in: ${css}`);
    if (failures >= 10) process.exit(1);
  }
}

for (const css of edgeCases) {
  check(css, 'edge');
}

const rng = random(seed);
for (let i = 0; i < count; i++) {
  const r = rng.int(10);
  let css;
  if (r === 0) {
    css = randKeyframeRule(rng);
  } else if (r === 1) {
    css = randPropertyRule(rng);
  } else {
    css = randRule(rng);
  }
  check(css, `seed-${seed}`);
}

const elapsed = ((Date.now() - started) / 1000).toFixed(1);
if (failures === 0) {
  console.log(`${checked} cases (seed ${seed}), clean in ${elapsed}s`);
} else {
  console.error(`${failures} divergence(s) in ${checked} cases, seed ${seed}`);
  process.exit(1);
}
