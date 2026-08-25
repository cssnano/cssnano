/** @import { random } from '../../../../util/fuzzRng.js' */
const ranges = [
  'u+2b00-2bff',
  'U+1E00-1EFF',
  'u+2120-212f',
  'u+0-7',
  'u+2002-2ff2',
  'u+0000-00ff',
  'u+??????',
  'u+1e00-1eff',
];
const atoms = [
  '/**/',
  ' ',
  ',',
  '\t',
  '',
  'foo',
  'var(--x)',
  'env(foo)',
  'initial',
];
/** @param {ReturnType<typeof random>} rng */
function value(rng) {
  const range = rng.pick(ranges);
  if (rng.chance(0.25)) {
    return `${rng.pick(['foo(', 'var(', 'calc('])}${range})`;
  }
  return Array.from(
    { length: 1 + rng.int(3) },
    () => `${rng.pick(atoms)}${range}`
  ).join(rng.pick([' ', ',', '']));
}
/** @param {ReturnType<typeof random>} rng */
function randRule(rng) {
  return `@font-face{font-family:x;unicode-range:${value(rng)}}`;
}
const edgeCases = ranges.map((range) => `@font-face{unicode-range:${range}}`);
export { edgeCases, randRule };
export default { edgeCases, randRule };
