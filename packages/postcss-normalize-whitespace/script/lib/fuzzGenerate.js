'use strict';

/**
 * Random declarations whose value ends in a run of backslashes and a
 * single following character, generated as the last declaration of a
 * rule or at-rule — the shape that makes PostCSS attribute a trailing
 * backslash escape's target to the container's `raws.after` instead of
 * the declaration's value (the `\9` IE hack, rewritten by tools like
 * esbuild into `\` followed by a literal tab, is one instance of it).
 *
 * The alphabet is small and every case's escape target is known at
 * generation time, which is what lets `fuzzCheck.js` assert the escaped
 * character survives without needing an independent CSS tokenizer.
 */

const { random } = require('../../../../util/fuzzRng.js');

const escapeTargets = [
  '9', // hex digit, the classic `\9` hack
  'a', // hex digit
  'z', // letter, not a hex digit
  '\t', // tab: how esbuild rewrites `\9`
  ' ', // space
  '\n', // newline: not a valid escape target per spec
  '\r', // carriage return: likewise
  '\f', // form feed: likewise
];

const baseValues = ['none', 'red', '"str"', '1px', 'inherit'];
const lastProps = ['color', 'display', 'width', '--custom'];
const siblingProps = ['color:red', 'display:none', 'width:1px'];
const containers = [
  { open: 'a{', close: '}' },
  { open: 'a::after{', close: '}' },
  { open: '@font-face{', close: '}' },
  { open: '@page{', close: '}' },
];

/**
 * @typedef {object} Case
 * @property {string} css
 * @property {string} lastProp
 * @property {number} siblingCount
 * @property {string} escapeChar
 * @property {number} backslashCount
 */

/**
 * @param {number} seed
 * @param {number} count
 * @return {Generator<Case>}
 */
function* generate(seed, count) {
  const rand = random(seed);

  for (let i = 0; i < count; i++) {
    const container = rand.pick(containers);
    const siblingCount = rand.int(3);
    const lastProp = rand.pick(lastProps);
    const backslashCount = rand.int(3) + 1;
    const escapeChar = rand.pick(escapeTargets);
    const trailingExtra = rand.chance(0.5)
      ? rand.pick([' ', '\t']).repeat(rand.int(3))
      : '';
    const withSemicolon = rand.chance(0.3);

    const siblings = Array.from({ length: siblingCount }, () =>
      rand.pick(siblingProps)
    )
      .map((decl) => `${decl};`)
      .join('');

    const value =
      baseValues[rand.int(baseValues.length)] +
      '\\'.repeat(backslashCount) +
      escapeChar +
      trailingExtra;

    const css = `${container.open}${siblings}${lastProp}:${value}${withSemicolon ? ';' : ''}${container.close}`;

    yield { css, lastProp, siblingCount, escapeChar, backslashCount };
  }
}

module.exports = { generate, random };
