import { random } from '../../../../util/fuzzRng.js';

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
const normalizationCases = [
  ['background:url( assets/a.png )', 'background:url( assets/a.png )'],
  ['background:url(foo\\ )', 'background:url(foo\\ )', true],
  ['background:url(foo\\\t)', 'background:url(foo\\\t)', true],
  [
    'transform:translate( 1px , 2px ) scale( 1 / 2 )',
    'transform:translate(1px,2px) scale(1/2)',
  ],
  ['width:calc( 100% - ( 10px / 2 ) )', 'width:calc(100% - (10px / 2))'],
  ['x:foo( /**/ a /**/ , /**/ b /**/ )', 'x:foo(/**/ a /**/,/**/ b /**/)'],
];
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
 * @property {boolean} [preserveURLValue]
 * @property {string} [expected]
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

    if (rand.chance(0.2)) {
      const [value, expectedValue, preserveURLValue] =
        rand.pick(normalizationCases);
      const siblings = Array.from({ length: siblingCount }, () =>
        rand.pick(siblingProps)
      )
        .map((decl) => `${decl};`)
        .join('');
      yield {
        css: `${container.open}${siblings}${value}${container.close}`,
        expected: `${container.open}${siblings}${expectedValue}${container.close}`,
        lastProp: value.slice(0, value.indexOf(':')),
        siblingCount,
        escapeChar: '',
        backslashCount: 0,
        preserveURLValue,
      };
      continue;
    }

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
export { generate };
