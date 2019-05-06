import test from 'ava';
import plugin from '..';
import {
  usePostCSSPlugin,
  processCSSFactory,
} from '../../../../util/testHelpers';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

function testTimingFunction(t, fixture, expected) {
  return Promise.all([
    processCSS(
      t,
      `animation:fade 3s ${fixture}`,
      `animation:fade 3s ${expected}`
    ),
    processCSS(
      t,
      `-webkit-animation:fade 3s ${fixture}`,
      `-webkit-animation:fade 3s ${expected}`
    ),
    processCSS(
      t,
      `animation-timing-function:${fixture}`,
      `animation-timing-function:${expected}`
    ),
    processCSS(
      t,
      `-webkit-animation-timing-function:${fixture}`,
      `-webkit-animation-timing-function:${expected}`
    ),
    processCSS(
      t,
      `transition:color 3s ${fixture}`,
      `transition:color 3s ${expected}`
    ),
    processCSS(
      t,
      `-webkit-transition:color 3s ${fixture}`,
      `-webkit-transition:color 3s ${expected}`
    ),
    processCSS(
      t,
      `transition-timing-function:${fixture}`,
      `transition-timing-function:${expected}`
    ),
    processCSS(
      t,
      `-webkit-transition-timing-function:${fixture}`,
      `-webkit-transition-timing-function:${expected}`
    ),
  ]);
}

function testPassthrough(t, fixture) {
  return testTimingFunction(t, fixture, fixture);
}

test(testTimingFunction, 'cubic-bezier(0.25, 0.1, 0.25, 1)', 'ease');

test(testTimingFunction, 'CUBIC-BEZIER(0.25, 0.1, 0.25, 1)', 'ease');

test(testTimingFunction, 'cubic-bezier(0, 0, 1, 1)', 'linear');

test(testTimingFunction, 'cubic-bezier(0.42, 0, 1, 1)', 'ease-in');

test(testTimingFunction, 'cubic-bezier(0, 0, 0.58, 1)', 'ease-out');

test(testTimingFunction, 'cubic-bezier(0.42, 0, 0.58, 1)', 'ease-in-out');

test(testTimingFunction, 'steps(1, start)', 'step-start');

test(testTimingFunction, 'steps(1, START)', 'step-start');

test(testTimingFunction, 'STEPS(1, start)', 'step-start');

test(testTimingFunction, 'steps(1, jump-start)', 'step-start');

test(testTimingFunction, 'steps(1, JUMP-START)', 'step-start');

test(testTimingFunction, 'STEPS(1, jump-start)', 'step-start');

test(testTimingFunction, 'steps(1, end)', 'step-end');

test(testTimingFunction, 'steps(1, END)', 'step-end');

test(testTimingFunction, 'STEPS(1, end)', 'step-end');

test(testTimingFunction, 'steps(1, jump-end)', 'step-end');

test(testTimingFunction, 'steps(1, JUMP-END)', 'step-end');

test(testTimingFunction, 'STEPS(1, jump-end)', 'step-end');

test(testPassthrough, 'steps(1)');

test(testPassthrough, 'STEPS(1)');

test(testPassthrough, 'steps(5,start)');

test(testTimingFunction, 'steps(10, end)', 'steps(10)');

test(testTimingFunction, 'steps(10, jump-end)', 'steps(10)');

test(testTimingFunction, 'steps(10, END)', 'steps(10)');

test(testTimingFunction, 'steps(10, JUMP-END)', 'steps(10)');

test(testPassthrough, 'steps(15)');

test(testPassthrough, 'var(--anim1)');

test(testPassthrough, 'VAR(--anim1)');

test(testPassthrough, 'cubic-bezier(0.25, var(--foo), 0.25, 1)');

test(
  testPassthrough,
  'cubic-bezier(var(--foo), var(--bar), var(--baz), var(--foz))'
);

test('should pass through broken syntax', passthroughCSS, 'h1{animation:}');

test(testPassthrough, 'cubic-bezier()');

test(testPassthrough, 'cubic-bezier(0, 0, 1, 1, 1, 1)');

test(testPassthrough, 'fade 3s steps(10, start())');

test(testPassthrough, 'fade 3s steps(10, jump-start())');

test(testPassthrough, 'fade 3s steps(10, end())');

test(testPassthrough, 'fade 3s steps(10, jump-end())');

test(testTimingFunction, 'cubic-bezier(0.25, 0.1, 0.25, 1)', 'ease');

test(testTimingFunction, 'cubic-bezier(0.250, 0.10, 0.250, 1)', 'ease');

test(testTimingFunction, 'cubic-bezier(0.250, 1e-1px, 0.250, 1)', 'ease');

test(
  'should supports multiple timing functions (animation-timing-function)',
  processCSS,
  'h1{animation-timing-function: cubic-bezier(0, 0, 1, 1), cubic-bezier(0, 0, 1, 1), steps(1, start)}',
  'h1{animation-timing-function: linear, linear, step-start}'
);

test(
  'should supports multiple timing functions (transition-timing-function)',
  processCSS,
  'h1{transition-timing-function: cubic-bezier(0, 0, 1, 1), cubic-bezier(0, 0, 1, 1), steps(1, start)}',
  'h1{transition-timing-function: linear, linear, step-start}'
);

test('should use the postcss plugin api', usePostCSSPlugin, plugin());
