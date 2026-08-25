/** @import { random } from '../../../../util/fuzzRng.js' */

const properties = [
  ['border', ['solid red 1px', 'rgba(0, 50, 50, 0.4) dashed thick']],
  ['outline', ['invert 1px solid', 'solid red .6em']],
  ['box-shadow', ['red 2px 5px 10px inset', 'red 1px,blue 2px 3px']],
  ['flex-flow', ['wrap column', 'row-reverse wrap-reverse']],
  ['list-style', ['inside url(icon.svg) none', 'square inside']],
  ['transition', ['ease 1s opacity', '0ms opacity calc(1ms)']],
  ['column-rule', ['solid red 1px']],
  ['columns', ['2 10px', '10px 2']],
  ['grid-auto-flow', ['dense row', 'column dense']],
  ['grid-column', ['[foo] / span 2', 'foo / bar']],
  ['grid-row', ['[foo] / span 2', 'foo / bar']],
  ['grid-column-gap', ['normal 1px', '1px normal']],
  ['grid-row-gap', ['normal 1px', '1px normal']],
  ['border-top', ['solid red 1px']],
  ['-webkit-border', ['solid red 1px']],
];

/** @param {ReturnType<typeof random>} rng @param {number} index */
function randRule(rng, index) {
  const [property, propertyValues] = properties[index % properties.length];
  const variants = [
    () => rng.pick(propertyValues),
    () => `${rng.pick(propertyValues)} /* fuzz ${index} */`,
    () =>
      `${rng.pick(propertyValues)}${property === 'box-shadow' ? ', transparent 0 0' : ''}`,
  ];
  const value =
    variants[Math.floor(index / properties.length) % variants.length]();
  const casing = rng.chance(0.2) ? property.toUpperCase() : property;
  const spacing = rng.chance(0.25) ? ' ' : '';
  return {
    branch: property,
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
  'a{border:solid red 1px;outline:invert 1px solid}',
];

export { edgeCases, properties, randRule };
