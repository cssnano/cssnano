import { test } from 'node:test';
import { processCSSFactory } from '../../../../util/testHelpers.js';
import plugin from '../../src/index.js';

const { processCSS } = processCSSFactory(plugin);

/* `margin` and `padding` share one grammar, and CSS property names are ASCII
 * case-insensitive, so each fixture is written once with `box` as the property
 * name and run for both properties in lowercase and uppercase. */
const spellings = [
  ['margin', 'margin'],
  ['MARGIN', 'margin'],
  ['padding', 'padding'],
  ['PADDING', 'padding'],
];

const replaceBox = (/** @type {string} */ text, /** @type {string} */ name) =>
  text.replaceAll(/box/giv, name);

/**
 * @param {{ message: string, fixture: string, expected: string | ((prop: string) => string) }[]} tests
 */
export function addTests(...tests) {
  for (const { message, fixture, expected } of tests) {
    for (const [prop, lowercaseProp] of spellings) {
      test(
        replaceBox(message, prop),
        processCSS(
          replaceBox(fixture, prop),
          typeof expected === 'function'
            ? expected(prop)
            : replaceBox(expected, lowercaseProp)
        )
      );
    }
  }
}
