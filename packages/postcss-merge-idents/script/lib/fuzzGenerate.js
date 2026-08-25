/** @import { random } from '../../../../util/fuzzRng.js' */
/** @param {ReturnType<typeof random>} rng @param {number} index */
function randRule(rng, index) {
  const name = `ident${index}`;
  const other = `other${rng.int(1000)}`;
  const branches = [
    () => ({
      branch: 'keyframes-animation-name',
      css: `@keyframes ${name}{to{opacity:1}}@keyframes ${other}{to{opacity:1}}a{animation-name:${name},${other}}`,
    }),
    () => ({
      branch: 'keyframes-animation-shorthand',
      css: `@keyframes ${name}{to{opacity:1}}@keyframes ${other}{to{opacity:1}}a{animation:${name} 1s,${other} 2s}`,
    }),
    () => ({
      branch: 'nested-keyframes',
      css: `@media all{@keyframes ${name}{to{opacity:1}}@keyframes ${other}{to{opacity:1}}a{animation:${name} 1s,${other} 2s}}`,
    }),
    () => ({
      branch: 'counter-style-list-style',
      css: `@counter-style ${name}{system:cyclic;symbols:a}@counter-style ${other}{system:cyclic;symbols:a}a{list-style:${name}}`,
    }),
  ];
  return branches[index % branches.length]();
}
const edgeCases = [
  '@keyframes a{to{opacity:1}}@keyframes b{to{opacity:1}}a{animation:a 1s,b 2s}',
  '@keyframes a{to{transform:none}}a{animation:a}',
];
export { edgeCases, randRule };
