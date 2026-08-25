/** @import { random } from '../../../../util/fuzzRng.js' */
const colors = [
  'red',
  'YELLOW',
  '#ffffff',
  '#00000080',
  'rgb(255, 0, 0)',
  'rgba(0,0,0,.5)',
  'hsl(0,100%,50%)',
  'var(--color)',
  'url(red.png)',
  'transparent',
  'not-a-color',
];
const props = [
  'color',
  'background',
  'box-shadow',
  'border-color',
  '--custom-color',
  'font-family',
  'filter',
];
/** @param {ReturnType<typeof random>} rng */
function randRule(rng) {
  const n = 1 + rng.int(4);
  return `a{${Array.from({ length: n }, () => `${rng.pick(props)}:${rng.pick(colors)}${rng.chance(0.3) ? ` ${rng.pick(colors)}` : ''}`).join(';')}}`;
}
const edgeCases = [
  'a{color:rgb(255,0,0)}',
  'a{background:linear-gradient(#fff,red)}',
  'a{color:var(--x)}',
  'a{font-family:black}',
  'a{background:URL(red.png)}',
  'a{color:rgb(50%,23,54)}',
];
export { edgeCases, randRule };
