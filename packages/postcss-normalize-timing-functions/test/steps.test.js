import { test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

const properties = [
  ['animation', (v) => `animation:fade 3s ${v}`],
  ['-webkit-animation', (v) => `-webkit-animation:fade 3s ${v}`],
  ['animation-timing-function', (v) => `animation-timing-function:${v}`],
  [
    '-webkit-animation-timing-function',
    (v) => `-webkit-animation-timing-function:${v}`,
  ],
  ['transition', (v) => `transition:color 3s ${v}`],
  ['-webkit-transition', (v) => `-webkit-transition:color 3s ${v}`],
  ['transition-timing-function', (v) => `transition-timing-function:${v}`],
  [
    '-webkit-transition-timing-function',
    (v) => `-webkit-transition-timing-function:${v}`,
  ],
];

function testTimingFunction(fixture, expected) {
  for (const [prop, template] of properties) {
    test(
      `${prop}: ${fixture}`,
      processCSS(template(fixture), template(expected))
    );
  }
}

function testPassthrough(fixture) {
  for (const [prop, template] of properties) {
    test(`${prop}: ${fixture}`, passthroughCSS(template(fixture)));
  }
}

testTimingFunction('steps(1, start)', 'step-start');
testTimingFunction('steps(1, START)', 'step-start');
testTimingFunction('STEPS(1, start)', 'step-start');
testTimingFunction('steps(1, jump-start)', 'step-start');
testTimingFunction('steps(1, JUMP-START)', 'step-start');
testTimingFunction('STEPS(1, jump-start)', 'step-start');
testTimingFunction('steps(1, end)', 'step-end');
testTimingFunction('steps(1, END)', 'step-end');
testTimingFunction('STEPS(1, end)', 'step-end');
testTimingFunction('steps(1, jump-end)', 'step-end');
testTimingFunction('steps(1, JUMP-END)', 'step-end');
testTimingFunction('STEPS(1, jump-end)', 'step-end');
testPassthrough('steps(1)');
testPassthrough('STEPS(1)');
testPassthrough('steps(5,start)');
testTimingFunction('steps(10, end)', 'steps(10)');
testTimingFunction('steps(10 /*comment*/, end)', 'steps(10)');
testTimingFunction('steps(10, jump-end)', 'steps(10)');
testTimingFunction('steps(10, END)', 'steps(10)');
testPassthrough('steps(1, jump-none)');
testTimingFunction('steps(10, JUMP-END)', 'steps(10)');
testPassthrough('steps(15)');
testPassthrough('fade 3s steps(10, start())');
testPassthrough('fade 3s steps(10, jump-start())');
testPassthrough('fade 3s steps(10, end())');
testPassthrough('fade 3s steps(10, jump-end())');
testPassthrough('steps(0, end)');
testPassthrough('steps(1.5, end)');
testPassthrough('steps(1px, end)');
testPassthrough('steps(-1, end)');
testTimingFunction('StEpS(1, \\65 ND)', 'step-end');
testTimingFunction('steps(/*a*/ 1 /*b*/, /*c*/ jump-\\65 nd)', 'step-end');
