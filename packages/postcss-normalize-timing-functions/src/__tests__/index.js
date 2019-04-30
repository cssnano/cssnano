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
      `animation-timing-function:${fixture}`,
      `animation-timing-function:${expected}`
    ),
    processCSS(
      t,
      `transition:color 3s ${fixture}`,
      `transition:color 3s ${expected}`
    ),
    processCSS(
      t,
      `transition-timing-function:${fixture}`,
      `transition-timing-function:${expected}`
    ),
  ]);
}

function testPassthrough(t, fixture) {
  return testTimingFunction(t, fixture, fixture);
}

test(testTimingFunction, 'cubic-bezier(0.25, 0.1, 0.25, 1)', 'ease');

test(
  'should support uppercase property',
  processCSS,
  'h1{animation: cubic-bezier(0.25, 0.1, 0.25, 1)}',
  'h1{animation: ease}'
);

test(
  'should support uppercase property #1',
  processCSS,
  'h1{animation: cubic-bezier(0.250, 0.10, 0.250, 1)}',
  'h1{animation: ease}'
);

test(
  'should support uppercase property #2',
  processCSS,
  'h1{animation: cubic-bezier(0.250, 1e-1px, 0.250, 1)}',
  'h1{animation: ease}'
);

test(testTimingFunction, 'CUBIC-BEZIER(0.25, 0.1, 0.25, 1)', 'ease');

test(testTimingFunction, 'cubic-bezier(0, 0, 1, 1)', 'linear');

test(testTimingFunction, 'cubic-bezier(0.42, 0, 1, 1)', 'ease-in');

test(testTimingFunction, 'cubic-bezier(0, 0, 0.58, 1)', 'ease-out');

test(testTimingFunction, 'cubic-bezier(0.42, 0, 0.58, 1)', 'ease-in-out');

test(testTimingFunction, 'steps(1, start)', 'step-start');

test(testTimingFunction, 'steps(1, start)', 'step-start');

test(testTimingFunction, 'steps(1, START)', 'step-start');

test(testTimingFunction, 'STEPS(1, start)', 'step-start');

test(testPassthrough, 'steps(1)');

test(testPassthrough, 'STEPS(1)');

test(testPassthrough, 'steps(5,start)');

test(testTimingFunction, 'steps(10, end)', 'steps(10)');

test(testTimingFunction, 'steps(10, END)', 'steps(10)');

test(testPassthrough, 'steps(15)');

test(testPassthrough, 'var(--anim1)');

test(testPassthrough, 'VAR(--anim1)');

test(testPassthrough, 'cubic-bezier(0.25, var(--foo), 0.25, 1)');

test(
  testPassthrough,
  'cubic-bezier(var(--foo), var(--bar), var(--baz), var(--foz))'
);

test('should pass through broken syntax', passthroughCSS, 'h1{animation:}');

test(
  'should pass through broken syntax #1',
  passthroughCSS,
  'h1{animation: cubic-bezier()}'
);

test(
  'should pass through broken syntax #2',
  passthroughCSS,
  'h1{animation: cubic-bezier(0, 0, 1, 1, 1, 1)}'
);

test(
  'should pass through broken syntax #3',
  passthroughCSS,
  'h1{animation: fade 3s steps(10, end())}'
);

test(
  'should pass through broken syntax #4',
  passthroughCSS,
  'h1{animation: fade 3s steps(1, start())}'
);

test('should use the postcss plugin api', usePostCSSPlugin, plugin());
