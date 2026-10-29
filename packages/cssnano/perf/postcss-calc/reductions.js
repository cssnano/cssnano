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

/**
 * One run of the calc stage over one calc() sum of `count` terms, optionally
 * followed by a comment, in milliseconds.
 *
 * @param {number} count
 * @param {boolean} comment
 * @return {number}
 */
function timeSum(count, comment) {
  const sum = Array.from({ length: count }, () => '1px').join(' + ');
  const text = comment ? `calc(${sum}) /* c */` : `calc(${sum})`;
  const buffer = new ValueBuffer(text);
  const start = performance.now();
  calc.create({}).forProperty('width')(buffer, 0);
  return performance.now() - start;
}

/**
 * The smallest size whose run takes at least 50 ms, found by doubling and then
 * bisecting the last doubling.
 *
 * @param {(size: number) => number} timeRun
 * @return {number}
 */
function smallestSize(timeRun) {
  let high = 1;
  while (timeRun(high) < 50) high *= 2;
  let low = high / 2;
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (timeRun(middle) < 50) low = middle;
    else high = middle;
  }
  return high;
}

test('postcss-calc reduces k calc() terms in one value in linear time', () => {
  assertLinearTime(timeOnce, 2000);
});

test('postcss-calc reduces one calc() sum of n terms in linear time', () => {
  for (const comment of [false, true]) {
    const timeSumOnce = (count) => timeSum(count, comment);
    assertLinearTime(timeSumOnce, smallestSize(timeSumOnce));
  }
});
