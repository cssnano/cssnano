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
  ['width:min( 100px , 1 / 2 )', 'width:min(100px,1 / 2)'],
  ['width:clamp( 1px , 1 / 2 , 5px )', 'width:clamp(1px,1 / 2,5px)'],
  ['width:round( 1 / 2 , 1px )', 'width:round(1 / 2,1px)'],
  ['color:hsl( 0 0% 0% / 0.5 )', 'color:hsl(0 0% 0%/0.5)'],
  ['x:foo( /**/ a /**/ , /**/ b /**/ )', 'x:foo(/**/ a /**/,/**/ b /**/)'],
  ['width:var(  --foo  )', 'width:var(--foo)'],
  ['width:var(  --foo  ,  10px  )', 'width:var(--foo,10px)'],
  ['width:var(  --foo  , )', 'width:var(--foo, )'],
  ['width:env(  safe-area  )', 'width:env(safe-area)'],
  [
    'width:env(  viewport-segment-width 0 0  )',
    'width:env(viewport-segment-width 0 0)',
  ],
  [
    'width:env(  viewport-segment-width 0 0  ,  10px  )',
    'width:env(viewport-segment-width 0 0,10px)',
  ],
  ['width:v\\61r(  --foo  )', 'width:v\\61r(--foo)'],
  ['width:v\\61r(  --foo  ,  10px  )', 'width:v\\61r(--foo,10px)'],
  [
    'width:var(  --x  , f( f( f( f( 1 , 2 , 3 ) , 4 ) , 5 ) )  )',
    'width:var(--x,f(f(f(f(1,2,3),4),5)))',
  ],
  [
    'width:var(  --x  , fn( fn( fn( fn( fn( fn( fn( fn(  0px , 1px , 2px  , 0px ) , 1px ) , 2px ) , 3px ) , 4px ) , 5px ) , 6px ) , 7px )  )',
    'width:var(--x,fn(fn(fn(fn(fn(fn(fn(fn(0px,1px,2px,0px),1px),2px),3px),4px),5px),6px),7px))',
  ],
  ['width:var(  --foo  , ( 10px ) )', 'width:var(--foo,(10px))'],
  ['width:var(  --foo  , ( 10px + 20px ) )', 'width:var(--foo,(10px + 20px))'],
  [
    'content:var(  --x  , "hello, "  ,  "world"  )',
    'content:var(--x,"hello, ","world")',
  ],
  [
    'font-family:var(  --f  , "Helvetica Neue"  ,  sans-serif  )',
    'font-family:var(--f,"Helvetica Neue",sans-serif)',
  ],
];
const containers = [
  { open: 'a{', close: '}' },
  { open: 'a::after{', close: '}' },
  { open: '@font-face{', close: '}' },
  { open: '@page{', close: '}' },
];

/**
 * Generate a normalization case whose fallback grammar changes on every
 * selection, rather than relying only on the fixed regression corpus above.
 * @param {{ int: (bound: number) => number, pick: <T>(items: readonly T[]) => T, chance: (probability: number) => boolean }} rand
 * @return {[string, string]}
 */
function generateNormalizationCase(rand) {
  if (rand.chance(0.5)) {
    const left = rand.pick(['10px', '1em', '2rem']);
    const right = rand.pick(['20px', '2em', '3rem']);
    const operator = rand.pick(['+', '-']);
    let input = `( ${left} ${operator} ${right} )`;
    let expected = `(${left} ${operator} ${right})`;

    for (let index = 0; index < rand.int(3); index++) {
      input = `fn( ${input} , ${index + 1}px )`;
      expected = `fn(${expected},${index + 1}px)`;
    }

    return [`width:var(  --x  ,  ${input}  )`, `width:var(--x,${expected})`];
  }

  const first = rand.pick(['"hello, "', '"Helvetica Neue"']);
  const second = rand.pick(['"world"', 'sans-serif']);
  return [
    `content:var(  --x  ,  ${first}  ,  ${second}  )`,
    `content:var(--x,${first},${second})`,
  ];
}

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
      const [value, expectedValue, preserveURLValue] = rand.chance(0.5)
        ? rand.pick(normalizationCases)
        : [...generateNormalizationCase(rand), undefined];
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
