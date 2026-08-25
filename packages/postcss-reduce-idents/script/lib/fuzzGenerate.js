/** @import { random } from '../../../../util/fuzzRng.js' */
const names = ['fade', 'spin-name', 'wide', 'narrow', 'title', '--custom'];
const spaces = ['', ' ', '  ', '\t'];

/** @param {ReturnType<typeof random>} rng */
function randRule(rng) {
  const a = rng.pick(names),
    b = rng.pick(names),
    space = rng.pick(spaces);
  return (
    `@keyframes ${a}{from{opacity:0}to{opacity:1}}@keyframes ${b}{to{transform:none}}` +
    `@counter-style ${a}{system:cyclic;symbols:${a} ${b};fallback:${b}}` +
    `:root{counter-reset:${a} 1 ${b} 2;counter-increment:${a};animation:${a} 1s${space},${b} 2s;` +
    `grid-template-columns:[${a} ${b}] auto [end];grid-column:${a} / ${b}}`
  );
}

const edgeCases = [
  '@keyframes fade{to{opacity:1}}a{animation-name:fade}',
  '@counter-style tally{system:extends decimal;fallback:decimal}:root{list-style:tally}',
  ':root{counter-reset:foo 1;content:counter(foo,decimal)}',
  ':root{grid-template-columns:[left middle] auto [right];grid-column:left / right}',
  ':root{grid-template-areas:"hero hero" "none hero";grid-area:hero}',
  ':root{counter-reset:foo/*comment*/ 1;content:counter(foo, "foo")}',
];
export { edgeCases, randRule };
