/** @import { random } from '../../../../util/fuzzRng.js' */

const families = [
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Ahem\\!',
  'inherit',
  'serif',
  'sans-serif',
  'ui-sans-serif',
  '"Helvetica Neue"',
  '"Bond 007"',
  '"11880-icons"',
  '" slab serif "',
  '"\\5FAE\\8F6F\\96C5\\9ED1"',
];
const weights = [
  'normal',
  'bold',
  'bolder',
  'lighter',
  '100',
  '400',
  '500',
  '700',
  '900',
  'var(--weight)',
  'env(font-weight)',
];
const sizes = ['xx-small', 'medium', '12px', '.8em', '100%', '2rem'];
const lineHeights = ['', '/normal', '/1.2', '/ 150%', '/ 1.5'];
const prefixes = [
  '',
  'italic',
  'oblique 20deg',
  'small-caps',
  'bold',
  '700',
  'ultra-condensed',
  'italic small-caps 700 condensed',
];
const options = [
  {},
  { removeDuplicates: false },
  { removeAfterKeyword: true },
  { removeQuotes: false },
];
const properties = ['font-family', 'font-weight', 'font'];

/** @param {ReturnType<typeof random>} rng */
function fontFamily(rng) {
  if (rng.chance(0.1)) return rng.pick(['var(--family)', 'env(font-family)']);
  const names = Array.from({ length: 1 + rng.int(4) }, () =>
    rng.pick(families)
  );
  return names.join(rng.pick([',', ', ', ',  ', ',\t']));
}

/** @param {ReturnType<typeof random>} rng */
function fontWeight(rng) {
  const weight = rng.pick(weights);
  return rng.chance(0.25) ? weight.toUpperCase() : weight;
}

/** @param {ReturnType<typeof random>} rng */
function fontShorthand(rng) {
  if (rng.chance(0.1)) return rng.pick(['var(--font)', 'env(font)']);
  const prefix = rng.pick(prefixes);
  const beforeSize = prefix ? `${prefix}${rng.pick([' ', '  ', '\t'])}` : '';
  return `${beforeSize}${rng.pick(sizes)}${rng.pick(lineHeights)}${rng.pick([' ', '  ', '\t'])}${fontFamily(rng)}`;
}

/** @param {ReturnType<typeof random>} rng @param {number} index */
function randRule(rng, index = 0) {
  const property = properties[index % properties.length];
  let value;
  if (property === 'font-family') value = fontFamily(rng);
  else if (property === 'font-weight') value = fontWeight(rng);
  else value = fontShorthand(rng);
  const opts = options[Math.floor(index / properties.length) % options.length];
  const option = Object.keys(opts)[0] || 'defaults';
  const casing = rng.chance(0.2) ? property.toUpperCase() : property;
  const spacing = rng.pick(['', ' ', '  ', '\t']);
  const trailing = rng.chance(0.25) ? ' /* fuzz */' : '';
  return {
    branch: property,
    css: `a.fuzz${index}{${casing}:${spacing}${value}${trailing};--fuzz:${index}}`,
    option,
    options: opts,
    value,
  };
}

const edgeCases = [
  'a{font-family:"Helvetica Neue", sans-serif}',
  'a{font-family:"A";font-family:"A"}',
  'a{font-family:"\\5FAE\\8F6F\\96C5\\9ED1"}',
  'a{font:italic small-caps normal 13px/150% "Helvetica Neue", sans-serif}',
  'a{font:700 12px/ 1.2 "A",serif}',
  'a{font-family:var(--family);font-weight:var(--weight)}',
  'a{font-family:"Call 0118 999 881 999 119 725 3"}',
  'a{font:oblique 20deg 2rem/normal Ahem\\!, ui-sans-serif}',
  'a{font-family:Arial,Arial,serif}',
  'a{FONT-WEIGHT:BOLD}',
];

const intentionalDifferences = new Set();

export {
  edgeCases,
  families,
  intentionalDifferences,
  options,
  properties,
  randRule,
};
