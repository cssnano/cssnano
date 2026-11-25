import { test } from 'node:test';

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

/**
 * Tests that `fixture` is rewritten to `expected` in each timing property.
 *
 * @param {(input: string, output: string) => (t: unknown) => unknown} processCSS
 *   the caller's processCSS, bound to its plugin
 * @param {string} fixture
 * @param {string} expected
 */
export function testTimingFunction(processCSS, fixture, expected) {
  for (const [prop, template] of properties) {
    test(
      `${prop}: ${fixture}`,
      processCSS(template(fixture), template(expected))
    );
  }
}

/**
 * Tests that `fixture` is left byte-identical in each timing property.
 *
 * @param {(css: string) => (t: unknown) => unknown} passthroughCSS the caller's
 *   passthroughCSS, bound to its plugin
 * @param {string} fixture
 */
export function testPassthrough(passthroughCSS, fixture) {
  for (const [prop, template] of properties) {
    test(`${prop}: ${fixture}`, passthroughCSS(template(fixture)));
  }
}
