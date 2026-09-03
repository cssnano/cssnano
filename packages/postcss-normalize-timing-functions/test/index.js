import { test } from 'node:test';
import {
  usePostCSSPlugin,
  processCSSFactory,
} from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

function testTimingFunction(fixture, expected) {
  return () =>
    Promise.all([
      processCSS(
        `animation:fade 3s ${fixture}`,
        `animation:fade 3s ${expected}`
      ),
      processCSS(
        `-webkit-animation:fade 3s ${fixture}`,
        `-webkit-animation:fade 3s ${expected}`
      ),
      processCSS(
        `animation-timing-function:${fixture}`,
        `animation-timing-function:${expected}`
      ),
      processCSS(
        `-webkit-animation-timing-function:${fixture}`,
        `-webkit-animation-timing-function:${expected}`
      ),
      processCSS(
        `transition:color 3s ${fixture}`,
        `transition:color 3s ${expected}`
      ),
      processCSS(
        `-webkit-transition:color 3s ${fixture}`,
        `-webkit-transition:color 3s ${expected}`
      ),
      processCSS(
        `transition-timing-function:${fixture}`,
        `transition-timing-function:${expected}`
      ),
      processCSS(
        `-webkit-transition-timing-function:${fixture}`,
        `-webkit-transition-timing-function:${expected}`
      ),
    ]);
}

function testPassthrough(t, fixture) {
  return testTimingFunction(t, fixture, fixture);
}

test(
  'cubic-bezier(0.25, 0.1, 0.25, 1)',
  testTimingFunction('cubic-bezier(0.25, 0.1, 0.25, 1)', 'ease')
);

test(
  'CUBIC-BEZIER(0.25, 0.1, 0.25, 1)',
  testTimingFunction('CUBIC-BEZIER(0.25, 0.1, 0.25, 1)', 'ease')
);

test(
  'cubic-bezier(0, 0, 1, 1)',
  testTimingFunction('cubic-bezier(0, 0, 1, 1)', 'linear')
);

test(
  'cubic-bezier(0.42, 0, 1, 1)',
  testTimingFunction('cubic-bezier(0.42, 0, 1, 1)', 'ease-in')
);

test(
  'cubic-bezier(0, 0, 0.58, 1)',
  testTimingFunction('cubic-bezier(0, 0, 0.58, 1)', 'ease-out')
);

test(
  'cubic-bezier(0.42, 0, 0.58, 1)',
  testTimingFunction('cubic-bezier(0.42, 0, 0.58, 1)', 'ease-in-out')
);

test('steps(1, start)', testTimingFunction('steps(1, start)', 'step-start'));

test('steps(1, START)', testTimingFunction('steps(1, START)', 'step-start'));

test('STEPS(1, start)', testTimingFunction('STEPS(1, start)', 'step-start'));

test(
  'steps(1, jump-start)',
  testTimingFunction('steps(1, jump-start)', 'step-start')
);

test(
  'steps(1, JUMP-START)',
  testTimingFunction('steps(1, JUMP-START)', 'step-start')
);

test(
  'STEPS(1, jump-start)',
  testTimingFunction('STEPS(1, jump-start)', 'step-start')
);

test('steps(1, end)', testTimingFunction('steps(1, end)', 'step-end'));

test('steps(1, END)', testTimingFunction('steps(1, END)', 'step-end'));

test('STEPS(1, end)', testTimingFunction('STEPS(1, end)', 'step-end'));

test(
  'steps(1, jump-end)',
  testTimingFunction('steps(1, jump-end)', 'step-end')
);

test(
  'steps(1, JUMP-END)',
  testTimingFunction('steps(1, JUMP-END)', 'step-end')
);

test(
  'STEPS(1, jump-end)',
  testTimingFunction('STEPS(1, jump-end)', 'step-end')
);

test('steps(1)', testPassthrough('steps(1)'));

test('STEPS(1)', testPassthrough('STEPS(1)'));

test('steps(5,start)', testPassthrough('steps(5,start)'));

test('steps(10, end)', testTimingFunction('steps(10, end)', 'steps(10)'));

test(
  'comments in steps count are omitted when reducing the function',
  testTimingFunction('steps(10 /*comment*/, end)', 'steps(10)')
);

test(
  'steps(10, jump-end)',
  testTimingFunction('steps(10, jump-end)', 'steps(10)')
);

test('steps(10, END)', testTimingFunction('steps(10, END)', 'steps(10)'));

test(
  'steps(1, jump-none) is not reduced because it is invalid',
  testPassthrough('steps(1, jump-none)')
);

test(
  'steps(10, JUMP-END)',
  testTimingFunction('steps(10, JUMP-END)', 'steps(10)')
);

test('steps(15)', testPassthrough('steps(15)'));

test('var(--anim1)', testPassthrough('var(--anim1)'));

test('VAR(--anim1)', testPassthrough('VAR(--anim1)'));

test(
  'cubic-bezier(0.25, var(--foo), 0.25, 1)',
  testPassthrough('cubic-bezier(0.25, var(--foo), 0.25, 1)')
);

test(
  'cubic-bezier(var(--foo), var(--bar), var(--baz), var(--foz))',
  testPassthrough(
    'cubic-bezier(var(--foo), var(--bar), var(--baz), var(--foz))'
  )
);

test('should pass through broken syntax', passthroughCSS('h1{animation:}'));

test('cubic-bezier()', testPassthrough('cubic-bezier()'));

test(
  'cubic-bezier(0, 0, 1, 1, 1, 1)',
  testPassthrough('cubic-bezier(0, 0, 1, 1, 1, 1)')
);

test(
  'fade 3s steps(10, start())',
  testPassthrough('fade 3s steps(10, start())')
);

test(
  'fade 3s steps(10, jump-start())',
  testPassthrough('fade 3s steps(10, jump-start())')
);

test('fade 3s steps(10, end())', testPassthrough('fade 3s steps(10, end())'));

test(
  'should preserve nested blocks in an unrecognized timing function',
  testPassthrough('steps(10, calc(1 + (2)))')
);

test(
  'should reduce recognized functions without touching unrelated functions',
  processCSS(
    'animation-timing-function:cubic-bezier(0,0,1,1),FOO(steps(1, start))',
    'animation-timing-function:linear,FOO(step-start)'
  )
);

test(
  'should preserve malformed timing-function arguments',
  testPassthrough('cubic-bezier(0,/*x*/0,1)')
);

test(
  'fade 3s steps(10, jump-end())',
  testPassthrough('fade 3s steps(10, jump-end())')
);

test(
  'cubic-bezier(0.25, 0.1, 0.25, 1) #1',
  testTimingFunction('cubic-bezier(0.25, 0.1, 0.25, 1)', 'ease')
);

test(
  'cubic-bezier(0.250, 0.10, 0.250, 1)',
  testTimingFunction('cubic-bezier(0.250, 0.10, 0.250, 1)', 'ease')
);

test(
  'cubic-bezier(0.250, 1e-1px, 0.250, 1)',
  testPassthrough('cubic-bezier(0.250, 1e-1px, 0.250, 1)')
);

test(
  'cubic-bezier percentages are not numbers',
  testPassthrough('cubic-bezier(0%, 0, 1, 1)')
);
test(
  'cubic-bezier adjacent numbers are not one number',
  testPassthrough('cubic-bezier(0 0, 0, 1, 1)')
);
test(
  'cubic-bezier dimensions are not numbers',
  testPassthrough('cubic-bezier(0px, 0, 1, 1)')
);

test(
  'steps requires a positive integer count',
  testPassthrough('steps(0, end)')
);
test('steps rejects fractional counts', testPassthrough('steps(1.5, end)'));
test('steps rejects dimensions', testPassthrough('steps(1px, end)'));
test('steps rejects negative counts', testPassthrough('steps(-1, end)'));

test(
  'escaped and mixed-case timing function identifiers are recognized',
  testTimingFunction('c\\75 Bic-Bezier(0, 0, 1, 1)', 'linear')
);
test(
  'escaped and mixed-case step positions are recognized',
  testTimingFunction('StEpS(1, \\65 ND)', 'step-end')
);
test(
  'comments and whitespace are allowed around exact arguments',
  testTimingFunction('cubic-bezier(/*a*/ 0 /*b*/, /*c*/ 0, 1, 1)', 'linear')
);
test(
  'comments and whitespace are allowed around step arguments',
  testTimingFunction('steps(/*a*/ 1 /*b*/, /*c*/ jump-\\65 nd)', 'step-end')
);

test(
  'nested blocks do not hide top-level commas',
  testTimingFunction(
    'cubic-bezier(0, 0, 1, 1), FOO([a,b], {c:d})',
    'linear, FOO([a,b], {c:d})'
  )
);
test(
  'mismatched and unclosed delimiters fail closed',
  testPassthrough('cubic-bezier(0, 0, 1, 1]')
);
test(
  'an unrelated malformed block prevents all value transformations',
  testPassthrough('cubic-bezier(0,0,1,1), foo(')
);
test(
  'unknown nested content is preserved',
  testTimingFunction(
    'FOO(steps(1, start()), [a,b], {c:d})',
    'FOO(steps(1, start()), [a,b], {c:d})'
  )
);

test(
  'should supports multiple timing functions (animation-timing-function)',
  processCSS(
    'h1{animation-timing-function: cubic-bezier(0, 0, 1, 1), cubic-bezier(0, 0, 1, 1), steps(1, start)}',
    'h1{animation-timing-function: linear, linear, step-start}'
  )
);

test(
  'should supports multiple timing functions (transition-timing-function)',
  processCSS(
    'h1{transition-timing-function: cubic-bezier(0, 0, 1, 1), cubic-bezier(0, 0, 1, 1), steps(1, start)}',
    'h1{transition-timing-function: linear, linear, step-start}'
  )
);

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));
