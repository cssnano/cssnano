import { random } from '../../../../../util/fuzzRng.js';
import { colors, components, sides, styles, widths } from './fuzzModel.js';

/* Colours a browser without support drops, so the plugin keeps the declaration
 * before them as a fallback. The correctness oracle cannot evaluate these, which
 * is why they live in a size-only generator rather than in `fuzzGenerate.js`. */
const fallbackColors = [
  'rgba(0,0,0,.5)',
  'lab(50% 10 10)',
  'oklch(60% .1 20)',
  'color-mix(in srgb,red,blue)',
];

const tokens = new Map([
  ['width', [...widths]],
  ['style', [...styles]],
  ['color', [...colors, ...fallbackColors]],
]);

/**
 * @param {ReturnType<typeof random>} rng
 * @param {string} component
 * @param {number} count
 * @return {string}
 */
function values(rng, component, count) {
  const alphabet = /** @type {string[]} */ (tokens.get(component));
  return Array.from({ length: count }, () => rng.pick(alphabet)).join(' ');
}

/**
 * @param {ReturnType<typeof random>} rng
 * @return {string}
 */
function shorthandValue(rng) {
  const chosen = components.filter(() => rng.chance(0.7));
  return (chosen.length > 0 ? chosen : [rng.pick(components)])
    .map((component) => values(rng, component, 1))
    .join(' ');
}

/**
 * @param {ReturnType<typeof random>} rng
 * @return {string}
 */
function declaration(rng) {
  const component = rng.pick(components);
  const side = rng.pick(sides);

  switch (rng.int(4)) {
    case 0:
      return `border:${shorthandValue(rng)}`;
    case 1:
      return `border-${side}:${shorthandValue(rng)}`;
    case 2:
      return `border-${component}:${values(rng, component, rng.int(4) + 1)}`;
    default:
      return `border-${side}-${component}:${values(rng, component, 1)}`;
  }
}

/**
 * Well-formed border rules with colours that need a fallback, for comparing
 * the size of the plugin's output between two revisions.
 *
 * @param {number} seed
 * @param {number} count
 * @return {string[]}
 */
export function generateBorderSizeCases(seed, count) {
  const rng = random(seed);

  return Array.from({ length: count }, () => {
    const length = rng.int(8) + 2;
    return `a{${Array.from({ length }, () => declaration(rng)).join(';')}}`;
  });
}
