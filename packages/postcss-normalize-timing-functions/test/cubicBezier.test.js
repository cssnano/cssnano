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

testTimingFunction('cubic-bezier(0.25, 0.1, 0.25, 1)', 'ease');
testTimingFunction('CUBIC-BEZIER(0.25, 0.1, 0.25, 1)', 'ease');
testTimingFunction('cubic-bezier(0, 0, 1, 1)', 'linear');
testTimingFunction('cubic-bezier(0.42, 0, 1, 1)', 'ease-in');
testTimingFunction('cubic-bezier(0, 0, 0.58, 1)', 'ease-out');
testTimingFunction('cubic-bezier(0.42, 0, 0.58, 1)', 'ease-in-out');
testPassthrough('cubic-bezier(0.25, var(--foo), 0.25, 1)');
testPassthrough('cubic-bezier(var(--foo), var(--bar), var(--baz), var(--foz))');
testPassthrough('cubic-bezier()');
testPassthrough('cubic-bezier(0, 0, 1, 1, 1, 1)');
testTimingFunction('cubic-bezier(0.25, 0.1, 0.25, 1)', 'ease');
testTimingFunction('cubic-bezier(0.250, 0.10, 0.250, 1)', 'ease');
testPassthrough('cubic-bezier(0.250, 1e-1px, 0.250, 1)');
testPassthrough('cubic-bezier(0%, 0, 1, 1)');
testPassthrough('cubic-bezier(0 0, 0, 1, 1)');
testPassthrough('cubic-bezier(0px, 0, 1, 1)');
testTimingFunction('c\\75 Bic-Bezier(0, 0, 1, 1)', 'linear');
testTimingFunction('cubic-bezier(/*a*/ 0 /*b*/, /*c*/ 0, 1, 1)', 'linear');
