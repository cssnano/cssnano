/** @import { random } from '../../../../util/fuzzRng.js' */
const names = ['fade', 'spin', 'a', 'b', 'var(--name)', 'none'];
/** @param {ReturnType<typeof random>} rng */
function randRule(rng) {
  const a = rng.pick(names),
    b = rng.pick(names);
  return `@keyframes ${a}{from{opacity:0}to{opacity:1}}@keyframes ${b}{from{opacity:0}to{opacity:1}}a{animation:${a} 1s,${b} 2s}`;
}
const edgeCases = [
  '@keyframes a{to{opacity:1}}@keyframes b{to{opacity:1}}a{animation:a 1s,b 2s}',
  '@keyframes a{to{transform:none}}a{animation:a}',
];
export { edgeCases, randRule };
