/** @import { random } from '../../../../util/fuzzRng.js' */
const values = [
  'block',
  'flow',
  'flow-root',
  'inline',
  'flex',
  'grid',
  'list-item',
  'table',
  'ruby',
  'var(--x)',
  '/*x*/',
];
/** @param {ReturnType<typeof random>} rng */
function randRule(rng) {
  const n = 1 + rng.int(4);
  return `a{display:${Array.from({ length: n }, () => rng.pick(values)).join(rng.pick([' ', '  ', '\t', ' /*x*/ ']))}}`;
}
const edgeCases = [
  'a{display:block flow}',
  'a{display:inline flow-root}',
  'a{display:var(--x) flow}',
  'a{display:block/*x*/flow}',
  'a{display:BLOCK FLOW}',
];
export { edgeCases, randRule };
