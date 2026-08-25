/** @import { random } from '../../../../util/fuzzRng.js' */
const names = ['fade', 'spin-name', 'wide', 'narrow', 'title', '--custom'];
const spaces = ['', ' ', '  ', '\t'];

/** @param {ReturnType<typeof random>} rng @param {number} index */
function randRule(rng, index = 0) {
  const a = `ident${index}`,
    b = `${rng.pick(names)}${rng.int(1000)}`,
    space = rng.pick(spaces);
  const branches = [
    () => `@keyframes ${a}{to{opacity:1}}a{animation:${a} 1s${space}}`,
    () =>
      `@counter-style ${a}{system:cyclic;symbols:a b;fallback:decimal}a{list-style:${a}}`,
    () =>
      `:root{counter-reset:${a} 1 ${b} 2;counter-increment:${a};content:counter(${a}) counters(${b},'.')}`,
    () =>
      `:root{grid-template-columns:[${a} ${b}] auto [end];grid-column:${a} / ${b};grid-template-areas:"${a} ${a}";grid-area:${a}}`,
  ];
  return {
    branch: ['keyframes', 'counter-style', 'counters', 'grid'][index % 4],
    css: branches[index % 4](),
  };
}

const edgeCases = [
  '@keyframes fade{to{opacity:1}}a{animation-name:fade}',
  '@counter-style tally{system:extends decimal;fallback:decimal}:root{list-style:tally}',
  ':root{counter-reset:foo 1;content:counter(foo,decimal)}',
  ':root{grid-template-columns:[left middle] auto [right];grid-column:left / right}',
  ':root{grid-template-areas:"hero hero" "none hero";grid-area:hero}',
  ':root{counter-reset:foo/*comment*/ 1;content:counter(foo, "foo")}',
  ':root{counter-reset:foo 1;content:counter(foo, "\\66 oo")}',
  ':root{grid-template-columns:[foo bar] repeat(2,[baz] 1fr);grid-column:[foo bar] / span 2}',
  ':root{grid-template-areas:"foo foo" /* keep */ "bar foo";grid-area:foo}',
  ':root{content:counter(foo,decimal) counters(foo,foo/*comment*/)}',
];
const intentionalDifferences = new Set([
  ':root{grid-template-columns:[foo bar] repeat(2,[baz] 1fr);grid-column:[foo bar] / span 2}',
]);
export { edgeCases, intentionalDifferences, randRule };
