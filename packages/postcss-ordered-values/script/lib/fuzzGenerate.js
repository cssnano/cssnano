/** @import { random } from '../../../../util/fuzzRng.js' */

const properties = [
  ['border', ['solid red 1px', 'rgba(0, 50, 50, 0.4) dashed thick']],
  ['border-top', ['solid red 1px', 'thin currentColor none']],
  ['border-block', ['dashed #fff medium', 'medium solid rgb(1 2 3)']],
  ['outline', ['invert 1px solid', 'solid red .6em']],
  ['box-shadow', ['red 2px 5px 10px inset', 'red 1px,blue 2px 3px']],
  ['flex-flow', ['wrap column', 'row-reverse wrap-reverse']],
  ['list-style', ['inside url(icon.svg) none', 'square inside']],
  ['transition', ['ease 1s opacity', '0ms opacity calc(1ms)']],
  ['animation', ['ease 1s fade', '2s ease-in-out 3 reverse both spin']],
  ['column-rule', ['solid red 1px']],
  ['columns', ['2 10px', '10px 2']],
  ['grid-auto-flow', ['dense row', 'column dense']],
  ['grid-column', ['[foo] / span 2', 'foo / bar']],
  ['grid-row', ['[foo] / span 2', 'foo / bar']],
  ['grid-column-start', ['2 span']],
  ['grid-column-end', ['span 2']],
  ['grid-row-start', ['2 span']],
  ['grid-row-end', ['span 2']],
  ['grid-column-gap', ['normal 1px', '1px normal']],
  ['grid-row-gap', ['normal 1px', '1px normal']],
  ['-webkit-border', ['solid red 1px']],
];

/** @param {ReturnType<typeof random>} rng */
function whitespace(rng) {
  return rng.pick([' ', '  ', '\t']);
}

/**
 * Compose spacing around the grammar's top-level separators rather than
 * selecting complete declaration strings. This keeps the sweep useful when a
 * parser change moves whitespace, comma, slash, or function boundaries.
 *
 * @param {string} value
 * @param {ReturnType<typeof random>} rng
 */
function composeValue(value, rng) {
  const space = whitespace(rng);
  let result = value.replaceAll(' ', space);

  if (result.includes(',')) {
    result = result.replaceAll(',', `,${whitespace(rng)}`);
  }
  if (result.includes('/')) {
    result = result.replaceAll('/', `${whitespace(rng)}/${whitespace(rng)}`);
  }

  return result;
}

/** @param {ReturnType<typeof random>} rng @param {number} index */
function randRule(rng, index = 0) {
  const [property, propertyValues] = properties[index % properties.length];
  let value = composeValue(rng.pick(propertyValues), rng);
  if (property === 'box-shadow' && index % 3 === 2) {
    value = `${value},${whitespace(rng)}transparent${whitespace(rng)}0${whitespace(rng)}0`;
  }
  const casing = rng.chance(0.2) ? property.toUpperCase() : property;
  const spacing = rng.chance(0.25) ? whitespace(rng) : '';
  return {
    branch: property,
    value,
    css: `a.fuzz${index}{${casing}:${spacing}${value};--fuzz:${index}}`,
  };
}

const edgeCases = [
  'a{border:solid 1px red}',
  'a{border:var(--border, solid 1px red)}',
  'a{box-shadow:red 2px 5px,blue 2px 5px}',
  'a{grid-column:[foo bar] / span 2}',
  'a{transition:0ms opacity calc(1ms)}',
  'a{list-style:inside url("icon.svg") none}',
  'a{border:foo(/**/bar) solid red}',
  'a{border:solid /* keep */ red 1px}',
  'a{border:solid url(foo.png) 1px}',
  'a{border:solid url("foo.png") 1px}',
  'a{box-shadow:inset 0 0 0 var(--shadow), rgb(0 0 0 / .2) 1px 2px}',
  'a{grid-column:[foo bar] / span calc(1 + 1)}',
  'a{transition:steps(2, jump-start) 1s opacity}',
  'a{border:solid foo(bar) 1px}',
  'a{border:solid "escaped\\\\ string" 1px}',
  'a{border:solid (red) 1px}',
  'a{transition:opacity 1s steps(2, jump-start), transform 2s linear}',
  'a{animation:fade 1s cubic-bezier(0.1, 0.7, 1, 0.1)}',
  'a{grid-column:span 2 / [foo bar]}',
  'a{border:solid red 1px /}',
  'a{border:solid red 1px;outline:invert 1px solid}',
];

export { edgeCases, properties, randRule };
