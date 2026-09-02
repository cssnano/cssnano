import { random } from '../../../../util/fuzzRng.js';

const properties = [
  [
    'border',
    [
      'solid red 1px',
      'rgba(0, 50, 50, 0.4) dashed thick',
      'calc(1px) solid #abc',
      'foo(steps(2, jump-start)) red 1px',
    ],
  ],
  [
    'border-top',
    [
      'solid red 1px',
      'thin currentColor none',
      'dotted transparent .25em',
      'medium rgb(1 2 3) groove',
    ],
  ],
  [
    'border-block',
    [
      'dashed #fff medium',
      'medium solid rgb(1 2 3)',
      'none color(display-p3 1 0 0) 2px',
      'max(1px, 2px) double blue',
    ],
  ],
  [
    'outline',
    [
      'invert 1px solid',
      'solid red .6em',
      'auto dotted currentColor',
      '0 dashed rgb(0 0 0 / .5)',
    ],
  ],
  [
    'box-shadow',
    [
      'red 2px 5px 10px inset',
      'red 1px,blue 2px 3px',
      '0 0 1px rgba(0,0,0,.2)',
      'inset -1px -2px 0 0 currentColor',
    ],
  ],
  [
    'flex-flow',
    ['wrap column', 'row-reverse wrap-reverse', 'nowrap row', 'column'],
  ],
  [
    'list-style',
    [
      'inside url(icon.svg) none',
      'square inside',
      'outside "marker" decimal',
      'url("a,b.svg") lower-alpha outside',
    ],
  ],
  [
    'transition',
    [
      'ease 1s opacity',
      '0ms opacity calc(1ms)',
      'linear 250ms transform',
      'steps(2, jump-start) 2s color',
    ],
  ],
  [
    'animation',
    [
      'ease 1s fade',
      '2s ease-in-out 3 reverse both spin',
      'linear 250ms infinite alternate slide',
      'steps(4, end) 1s paused none',
    ],
  ],
  [
    'column-rule',
    [
      'solid red 1px',
      'medium dotted currentColor',
      'thin groove #abc',
      'double transparent .1em',
    ],
  ],
  ['columns', ['2 10px', '10px 2', 'auto 20em', '3 min(30ch, 40vw)']],
  ['grid-auto-flow', ['dense row', 'column dense', 'row', 'dense column']],
  [
    'grid-column',
    [
      '[foo] / span 2',
      'foo / bar',
      'span 3 / [line name]',
      '[foo bar] / span calc(1 + 1)',
    ],
  ],
  [
    'grid-row',
    [
      '[foo] / span 2',
      'foo / bar',
      'span 3 / [line name]',
      '[foo bar] / span min(2, 3)',
    ],
  ],
  ['grid-column-start', ['2 span', 'span foo', '[line name]', 'auto']],
  ['grid-column-end', ['span 2', 'foo', '[end]', 'span calc(1 + 1)']],
  ['grid-row-start', ['2 span', 'span foo', '[row name]', 'auto']],
  ['grid-row-end', ['span 2', 'foo', '[row end]', 'span min(2, 3)']],
  ['grid-column-gap', ['normal 1px', '1px normal', '2em', 'calc(1px + 2px)']],
  ['grid-row-gap', ['normal 1px', '1px normal', '3vw', 'min(2px, 3px)']],
  [
    '-webkit-border',
    [
      'solid red 1px',
      'dashed #abc medium',
      'thin double currentColor',
      'none blue 2px',
    ],
  ],
];

const atoms = [
  '1px',
  '2px',
  '0',
  'solid',
  'dashed',
  'red',
  '#fff',
  'currentColor',
  'none',
  'normal',
  'auto',
  'foo',
  'fade',
  'opacity',
  'transform',
  'url(icon.svg)',
  'url("a,b.svg")',
  '"escaped\\\\ string"',
  'var(--value)',
  'calc(1px + 1px)',
  'min(1px, 2vw)',
  'rgb(0 0 0 / .2)',
  '[line name]',
  '(red)',
  'foo(steps(2, jump-start))',
];

/* A fifth semantic alternative keeps the diversity floor independent of
 * whitespace, selector, casing, and vendor-prefix variation. */
const extraValues = new Map([
  ['border', 'double blue 2px'],
  ['border-top', 'outset #123 3px'],
  ['border-block', 'groove green 4px'],
  ['outline', 'thick double blue'],
  ['box-shadow', '2px 3px 4px #123'],
  ['flex-flow', 'wrap row-reverse'],
  ['list-style', 'circle outside'],
  ['transition', 'ease-in 500ms background-color'],
  ['animation', '2s ease-out 2 normal forwards bounce'],
  ['column-rule', 'dashed blue 2px'],
  ['columns', '4 25rem'],
  ['grid-auto-flow', 'column'],
  ['grid-column', 'auto / 4'],
  ['grid-row', 'auto / 5'],
  ['grid-column-start', '4'],
  ['grid-column-end', '6'],
  ['grid-row-start', '7'],
  ['grid-row-end', '8'],
  ['grid-column-gap', '5%'],
  ['grid-row-gap', '6ch'],
  ['-webkit-border', 'groove green 3px'],
]);

function whitespace(rng) {
  return rng.pick([' ', '  ', '\t']);
}

function composeValue(value, rng) {
  let result = value.replaceAll(' ', whitespace(rng));
  if (result.includes(','))
    result = result.replaceAll(',', `,${whitespace(rng)}`);
  if (result.includes('/')) {
    result = result.replaceAll('/', `${whitespace(rng)}/${whitespace(rng)}`);
  }
  return result;
}

function semanticKey(value) {
  return value
    .trim()
    .replaceAll(/\s+/g, ' ')
    .replaceAll(/\s*,\s*/g, ',')
    .replaceAll(/\s*\/\s*/g, '/');
}

function features(value) {
  const result = new Set();
  if (value.includes(',')) result.add('comma');
  if (value.includes('/')) result.add('slash');
  if (/\b(?:min|max|clamp|calc|steps|rgb|rgba|color)\(/i.test(value)) {
    result.add('nested-function');
  }
  if (/\burl\(/i.test(value)) result.add('url');
  if (/url\("/i.test(value)) result.add('quoted-url');
  if (/"/.test(value)) result.add('string');
  if (/\\/.test(value)) result.add('escape');
  if (/[[\](){}]/.test(value)) result.add('block');
  if (/\b(?:var|env|constant)\(/i.test(value)) result.add('substitution');
  if (value.includes('___CSS_LOADER_IMPORT___')) result.add('css-loader');
  if (value.includes('/*')) result.add('comment');
  if (value.trim().endsWith('/')) result.add('malformed');
  return [...result];
}

function valueFor(rng, property, index) {
  const [, values] =
    properties.find(([name]) => name === property) ?? properties[0];
  let value = rng.pick([...values, extraValues.get(property)]);

  /* These additions are deliberately attached to compatible grammar branches. */
  if (index % 7 === 0 && property === 'box-shadow') {
    value = `${value},${whitespace(rng)}transparent${whitespace(rng)}0${whitespace(rng)}0`;
  } else if (
    index % 7 === 1 &&
    ['transition', 'animation'].includes(property)
  ) {
    value = `${value},${whitespace(rng)}transform${whitespace(rng)}2s${whitespace(rng)}linear`;
  } else if (index % 5 === 0 && property === 'grid-column') {
    value = '[foo bar] / span calc(1 + 1)';
  } else if (index % 11 === 0 && property === 'border') {
    value = `${rng.pick(atoms)} ${rng.pick(atoms)} ${rng.pick(atoms)}`;
  }

  return composeValue(value, rng);
}

function randRule(rng, index = 0) {
  const [property] = properties[index % properties.length];
  const value = valueFor(rng, property, index);
  const prefixed =
    property.startsWith('-') || !rng.chance(0.12)
      ? property
      : rng.pick([`-webkit-${property}`, `-moz-${property}`]);
  const prop = rng.chance(0.2) ? prefixed.toUpperCase() : prefixed;
  const spacing = rng.chance(0.25) ? whitespace(rng) : '';
  return {
    branch: property,
    value,
    semanticKey: semanticKey(value),
    features: features(value),
    css: `a.fuzz${index}{${prop}:${spacing}${value};--fuzz:${index}}`,
  };
}

/* Named cases stay fixed: these are the syntax roles most likely to be split. */
const edgeCases = [
  {
    name: 'comment-abort',
    branch: 'border',
    css: 'a{border:solid /* keep */ red 1px}',
  },
  {
    name: 'substitution-abort',
    branch: 'border',
    css: 'a{border:var(--border, solid 1px red)}',
  },
  {
    name: 'css-loader-abort',
    branch: 'list-style',
    css: 'a{list-style:inside ___CSS_LOADER_IMPORT___ none}',
  },
  {
    name: 'quoted-url',
    branch: 'border',
    css: 'a{border:solid url("a,b.svg") 1px}',
  },
  {
    name: 'bare-url',
    branch: 'list-style',
    css: 'a{list-style:inside url(icon.svg) none}',
  },
  {
    name: 'nested-commas',
    branch: 'transition',
    css: 'a{transition:steps(2, jump-start) 1s opacity}',
  },
  {
    name: 'math-functions',
    branch: 'border',
    css: 'a{border:red solid min(1px, calc(2px + 1px))}',
  },
  {
    name: 'bracket-block',
    branch: 'grid-column',
    css: 'a{grid-column:[foo bar] / span 2}',
  },
  {
    name: 'escaped-string',
    branch: 'border',
    css: 'a{border:solid "escaped\\\\ string" 1px}',
  },
  {
    name: 'malformed-processable',
    branch: 'border',
    css: 'a{border:solid red 1px /}',
  },
];

function* generate(seed, count) {
  const rng = random(seed);
  for (let index = 0; index < count; index++) yield randRule(rng, index);
}

export { edgeCases, generate, properties, randRule };
