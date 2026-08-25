/** @import { random } from '../../../../util/fuzzRng.js' */
const funcs = [
  'cubic-bezier(.25,.1,.25,1)',
  'cubic-bezier(0, 0, 1, 1)',
  'steps(1,start)',
  'steps(1, jump-end)',
  'cubic-bezier(0.42,0,0.58,1)',
  'cubic-bezier(var(--x),0,1,1)',
  'cubic-bezier(0,0,1,1)',
];
/** @param {ReturnType<typeof random>} rng */
function randRule(rng) {
  return `a{${rng.pick(['animation-timing-function', 'transition-timing-function', 'animation', '-webkit-animation-timing-function'])}:${rng.pick(funcs)}${rng.chance(0.4) ? ` ${rng.pick(funcs)}` : ''}}`;
}
const edgeCases = funcs.map((x) => `a{animation-timing-function:${x}}`);
export { edgeCases, randRule };
