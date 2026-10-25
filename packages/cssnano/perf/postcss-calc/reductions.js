import { test } from 'node:test';
import calc from '../../src/plugins/postcss-calc/index.js';
import { ValueBuffer } from '../../src/values/valueBuffer.js';
import { assertLinearTime } from '../passes/merge/lib/linearTiming.js';

/**
 * One run of the calc stage over a value with `count` reductions, in
 * milliseconds. The source text is built before the clock starts.
 *
 * @param {number} count
 * @return {number}
 */
function timeOnce(count) {
  const text = Array.from({ length: count }, () => 'calc(1px + 2px)').join(' ');
  const buffer = new ValueBuffer(text);
  const start = performance.now();
  calc.create({}).forProperty('width')(buffer, 0);
  return performance.now() - start;
}

test('postcss-calc reduces k calc() terms in one value in linear time', () => {
  assertLinearTime(timeOnce, 2000);
});
