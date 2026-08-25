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
/** @param {ReturnType<typeof random>} rng @param {number} index */
function randRule(rng, index) {
  const prefix = (0x1000 + index).toString(16);
  const branches = [
    () => ['single-range', `u+${prefix}`],
    () => ['mergeable-range', `u+${prefix}00-${prefix}ff`],
    () => ['unmergeable-range', `u+${prefix}01-${prefix}fe`],
    () => ['wildcard-range', `u+${prefix}??`],
    () => [
      'comma-separated-ranges',
      `u+${prefix},u+${rng.pick(ranges).slice(2)}`,
    ],
  ];
  const [branch, value] = branches[index % branches.length]();
  return {
    branch,
    css: `@font-face{font-family:f${index};unicode-range:${value}}`,
  };
}
const edgeCases = ranges.map((range) => `@font-face{unicode-range:${range}}`);
export { edgeCases, randRule };
export default { edgeCases, randRule };
