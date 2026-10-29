import { test } from 'node:test';
import { oneStagePlugin } from '../../../../util/testHelpers.js';
import minifyParams from '../../src/plugins/postcss-minify-params/index.js';
import {
  assertLinearTime,
  timeOneRun,
} from '../passes/merge/lib/linearTiming.js';

const plugin = oneStagePlugin(minifyParams);

/**
 * One run of the whole plugin over a `@supports` prelude nested `depth` deep,
 * with `depth` sums of additive operators inside the innermost group, in
 * milliseconds.
 *
 * @param {number} depth
 * @return {number}
 */
function timeOnce(depth) {
  const css = `@supports ${'('.repeat(depth)}${'1px + 1px '.repeat(depth)}${')'.repeat(depth)}{a{color:red}}`;
  return timeOneRun(plugin, css);
}

test('minify-params minifies a prelude nested n deep in linear time', () => {
  assertLinearTime(timeOnce, 2500);
});
